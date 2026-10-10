import {
  ESKIZ_BASE_URL,
  ESKIZ_DEFAULT_FROM,
  EskizSmsProvider,
  jwtExpiryMs,
} from '../../functions/_shared/sms/EskizSmsProvider';
import { SmsError } from '../../functions/_shared/sms/SmsProvider';

const NOW_MS = Date.UTC(2026, 9, 10, 10, 0, 0);
const CONFIG = { email: 'ops@example.test', password: 'secret' };
const INPUT = { to: '+998901234567', text: '1Heal: код 123456', purpose: 'otp' as const };

interface Call {
  method: string;
  path: string;
  authorization: string | null;
  form: Record<string, string> | null;
}

type Reply = { status: number; body: unknown } | Error;

function base64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwt(expSec: number): string {
  return `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify({ exp: expSec }))}.sig`;
}

const TOKEN_VALID = jwt(NOW_MS / 1000 + 30 * 24 * 3600);
const TOKEN_NEW = jwt(NOW_MS / 1000 + 60 * 24 * 3600);

/** A fetch that answers from a queue and records what it was asked. */
function fakeFetch(replies: Reply[]): { fetch: typeof globalThis.fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    const form =
      init?.body instanceof FormData
        ? Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, String(v)]))
        : null;
    calls.push({
      method: init?.method ?? 'GET',
      path: url.replace(ESKIZ_BASE_URL, ''),
      authorization: headers.get('authorization'),
      form,
    });
    const reply = replies.shift();
    if (reply === undefined) throw new Error(`unexpected request ${url}`);
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls };
}

const LOGIN_OK = {
  status: 200,
  body: { message: 'token_generated', data: { token: TOKEN_VALID } },
};
const SEND_OK = {
  status: 200,
  body: { id: '4b1f', status: 'waiting', message: 'Waiting for SMS provider' },
};

function provider(
  replies: Reply[],
  options: { now?: () => number; from?: string; callbackUrl?: string } = {},
) {
  const { fetch, calls } = fakeFetch(replies);
  const instance = new EskizSmsProvider(
    { ...CONFIG, from: options.from, callbackUrl: options.callbackUrl },
    { fetch, now: options.now ?? (() => NOW_MS) },
  );
  return { instance, calls };
}

async function expectSmsError(action: Promise<unknown>, code: SmsError['code']): Promise<SmsError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(SmsError);
    const smsError = error as SmsError;
    expect(smsError.code).toBe(code);
    return smsError;
  }
  throw new Error(`expected SmsError ${code}`);
}

describe('EskizSmsProvider', () => {
  test('logs in, then posts the message as form data with the bearer token', async () => {
    const { instance, calls } = provider([LOGIN_OK, SEND_OK]);
    await expect(instance.send(INPUT)).resolves.toEqual({ providerMessageId: '4b1f' });
    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/auth/login',
        authorization: null,
        form: { email: CONFIG.email, password: CONFIG.password },
      },
      {
        method: 'POST',
        path: '/message/sms/send',
        authorization: `Bearer ${TOKEN_VALID}`,
        form: { mobile_phone: '998901234567', message: INPUT.text, from: ESKIZ_DEFAULT_FROM },
      },
    ]);
    expect(instance.name).toBe('eskiz');
  });

  test('reuses the cached token and sends the configured sender and callback', async () => {
    const { instance, calls } = provider([LOGIN_OK, SEND_OK, SEND_OK], {
      from: '1Heal',
      callbackUrl: 'https://example.test/eskiz/callback',
    });
    await instance.send(INPUT);
    await instance.send(INPUT);
    expect(calls.map((call) => call.path)).toEqual([
      '/auth/login',
      '/message/sms/send',
      '/message/sms/send',
    ]);
    expect(calls[2]?.form).toEqual({
      mobile_phone: '998901234567',
      message: INPUT.text,
      from: '1Heal',
      callback_url: 'https://example.test/eskiz/callback',
    });
  });

  test('concurrent sends share a single login', async () => {
    const { instance, calls } = provider([LOGIN_OK, SEND_OK, SEND_OK]);
    await expect(Promise.all([instance.send(INPUT), instance.send(INPUT)])).resolves.toEqual([
      { providerMessageId: '4b1f' },
      { providerMessageId: '4b1f' },
    ]);
    expect(calls.map((call) => call.path)).toEqual([
      '/auth/login',
      '/message/sms/send',
      '/message/sms/send',
    ]);
  });

  test('logs in again once the cached token JWT is about to expire', async () => {
    let now = NOW_MS;
    const { instance, calls } = provider([LOGIN_OK, SEND_OK, LOGIN_OK, SEND_OK], {
      now: () => now,
    });
    await instance.send(INPUT);
    now += 30 * 24 * 3600 * 1000 - 30_000; // 30 s before exp: inside the safety margin
    await instance.send(INPUT);
    expect(calls.map((call) => call.path)).toEqual([
      '/auth/login',
      '/message/sms/send',
      '/auth/login',
      '/message/sms/send',
    ]);
  });

  test('on 401 refreshes the token with PATCH /auth/refresh and retries once', async () => {
    const { instance, calls } = provider([
      LOGIN_OK,
      { status: 401, body: { message: 'Token expired' } },
      { status: 200, body: { data: { token: TOKEN_NEW } } },
      SEND_OK,
    ]);
    await expect(instance.send(INPUT)).resolves.toEqual({ providerMessageId: '4b1f' });
    expect(calls.map((call) => [call.method, call.path, call.authorization])).toEqual([
      ['POST', '/auth/login', null],
      ['POST', '/message/sms/send', `Bearer ${TOKEN_VALID}`],
      ['PATCH', '/auth/refresh', `Bearer ${TOKEN_VALID}`],
      ['POST', '/message/sms/send', `Bearer ${TOKEN_NEW}`],
    ]);
  });

  test('falls back to a fresh login when the refresh is rejected', async () => {
    const { instance, calls } = provider([
      LOGIN_OK,
      { status: 401, body: {} },
      { status: 401, body: { message: 'Unauthenticated' } },
      { status: 200, body: { data: { token: TOKEN_NEW } } },
      SEND_OK,
    ]);
    await expect(instance.send(INPUT)).resolves.toEqual({ providerMessageId: '4b1f' });
    expect(calls.map((call) => call.path)).toEqual([
      '/auth/login',
      '/message/sms/send',
      '/auth/refresh',
      '/auth/login',
      '/message/sms/send',
    ]);
  });

  test('gives up with AUTH when the retry is rejected too', async () => {
    const { instance, calls } = provider([
      LOGIN_OK,
      { status: 401, body: {} },
      { status: 200, body: { data: { token: TOKEN_NEW } } },
      { status: 401, body: { message: 'Unauthenticated' } },
    ]);
    const error = await expectSmsError(instance.send(INPUT), 'AUTH');
    expect(error.status).toBe(401);
    expect(calls).toHaveLength(4);
  });

  test('maps login failures to AUTH', async () => {
    const { instance } = provider([{ status: 401, body: { message: 'Wrong email or password' } }]);
    const error = await expectSmsError(instance.send(INPUT), 'AUTH');
    expect(error.message).toContain('Wrong email or password');
    expect(error.retryable).toBe(false);
  });

  test.each([
    ['429 to RATE_LIMIT', { status: 429, body: { message: 'Too many requests' } }, 'RATE_LIMIT'],
    ['503 to PROVIDER_DOWN', { status: 503, body: {} }, 'PROVIDER_DOWN'],
    [
      '400 about the number to INVALID_NUMBER',
      { status: 400, body: { data: { alert: 'The mobile_phone field is invalid' } } },
      'INVALID_NUMBER',
    ],
    ['other 400 to UNKNOWN', { status: 400, body: { message: 'Balance is empty' } }, 'UNKNOWN'],
    [
      '200 with status fail to UNKNOWN',
      { status: 200, body: { status: 'fail', data: { alert: 'Sender not approved' } } },
      'UNKNOWN',
    ],
  ] as const)('maps a send %s', async (_label, reply, code) => {
    const { instance } = provider([LOGIN_OK, reply]);
    await expectSmsError(instance.send(INPUT), code);
  });

  test('maps network failures to PROVIDER_DOWN', async () => {
    const { instance } = provider([new TypeError('fetch failed')]);
    const error = await expectSmsError(instance.send(INPUT), 'PROVIDER_DOWN');
    expect(error.retryable).toBe(true);
    expect(error.message).toContain('fetch failed');
  });

  test('rejects non-Uzbek numbers before any request', async () => {
    const { instance, calls } = provider([]);
    await expectSmsError(instance.send({ ...INPUT, to: '+1333363128' }), 'INVALID_NUMBER');
    expect(calls).toHaveLength(0);
  });

  test('a token without a JWT expiry is still cached', async () => {
    const { instance, calls } = provider([
      { status: 200, body: { data: { token: 'opaque-token' } } },
      SEND_OK,
      SEND_OK,
    ]);
    await instance.send(INPUT);
    await instance.send(INPUT);
    expect(calls.filter((call) => call.path === '/auth/login')).toHaveLength(1);
  });

  test('a login response without a token is UNKNOWN', async () => {
    const { instance } = provider([{ status: 200, body: { message: 'ok' } }]);
    await expectSmsError(instance.send(INPUT), 'UNKNOWN');
  });

  test('a send response without an id resolves without a message id', async () => {
    const { instance } = provider([LOGIN_OK, { status: 200, body: { status: 'waiting' } }]);
    await expect(instance.send(INPUT)).resolves.toEqual({});
  });
});

describe('jwtExpiryMs', () => {
  test('reads exp from the payload and ignores anything else', () => {
    expect(jwtExpiryMs(jwt(1_800_000_000))).toBe(1_800_000_000_000);
    expect(jwtExpiryMs('opaque')).toBeNull();
    expect(jwtExpiryMs(`a.${base64url('{"sub":"x"}')}.c`)).toBeNull();
    expect(jwtExpiryMs('a.!!!.c')).toBeNull();
  });
});
