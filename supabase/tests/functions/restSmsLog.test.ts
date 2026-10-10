import {
  parseDecision,
  RestSmsLog,
  SmsLogUnavailableError,
} from '../../functions/_shared/hooks/restSmsLog';

const URL_BASE = 'https://xyz.supabase.co';
const KEY = 'service-role-key';
const NOW = new Date('2026-10-10T10:00:00Z');

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function fakeFetch(reply: { status: number; body?: unknown } | Error) {
  const calls: Captured[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    });
    if (reply instanceof Error) throw reply;
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls };
}

function store(reply: { status: number; body?: unknown } | Error) {
  const { fetch, calls } = fakeFetch(reply);
  return {
    store: new RestSmsLog({ supabaseUrl: `${URL_BASE}/`, serviceRoleKey: KEY, fetch }),
    calls,
  };
}

describe('RestSmsLog.check', () => {
  test('calls rpc/sms_rate_limit_check with the service key and parses "allowed"', async () => {
    const { store: limiter, calls } = store({ status: 200, body: { allowed: true } });
    await expect(
      limiter.check({ phone: '+998901234567', ip: '203.0.113.9', purpose: 'otp', now: NOW }),
    ).resolves.toEqual({ allowed: true });
    expect(calls).toEqual([
      {
        url: `${URL_BASE}/rest/v1/rpc/sms_rate_limit_check`,
        method: 'POST',
        headers: {
          apikey: KEY,
          authorization: `Bearer ${KEY}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: { p_phone_e164: '+998901234567', p_ip: '203.0.113.9', p_purpose: 'otp' },
      },
    ]);
  });

  test('passes a null IP when none is known and parses a denial', async () => {
    const { store: limiter, calls } = store({
      status: 200,
      body: { allowed: false, scope: 'phone', rule: 'phone_10m', retry_after_sec: 539.2 },
    });
    await expect(
      limiter.check({ phone: '+998901234567', purpose: 'otp', now: NOW }),
    ).resolves.toEqual({ allowed: false, scope: 'phone', rule: 'phone_10m', retryAfterSec: 540 });
    expect(calls[0]?.body).toEqual({ p_phone_e164: '+998901234567', p_ip: null, p_purpose: 'otp' });
  });

  test('throws SmsLogUnavailableError on HTTP errors, network errors and odd bodies', async () => {
    const input = { phone: '+998901234567', purpose: 'otp' as const, now: NOW };
    await expect(
      store({ status: 500, body: { message: 'boom' } }).store.check(input),
    ).rejects.toThrow(SmsLogUnavailableError);
    await expect(store(new TypeError('fetch failed')).store.check(input)).rejects.toThrow(
      /fetch failed/,
    );
    await expect(store({ status: 200, body: 'yes' }).store.check(input)).rejects.toThrow(
      SmsLogUnavailableError,
    );
  });
});

describe('RestSmsLog.record', () => {
  test('inserts the row through the Data API without asking for it back', async () => {
    const { store: log, calls } = store({ status: 201 });
    await log.record({
      phone: '+998901234567',
      purpose: 'otp',
      provider: 'eskiz',
      providerMessageId: '4b1f',
      status: 'sent',
      ip: '203.0.113.9',
      at: NOW,
    });
    expect(calls[0]).toMatchObject({
      url: `${URL_BASE}/rest/v1/sms_send_log`,
      method: 'POST',
      headers: { prefer: 'return=minimal', apikey: KEY },
      body: {
        phone_e164: '+998901234567',
        purpose: 'otp',
        provider: 'eskiz',
        provider_msg_id: '4b1f',
        status: 'sent',
        ip: '203.0.113.9',
      },
    });
  });

  test('sends nulls for optional columns and reports failures', async () => {
    const ok = store({ status: 201 });
    await ok.store.record({
      phone: '+998901234567',
      purpose: 'otp',
      provider: 'mock',
      status: 'failed',
      at: NOW,
    });
    expect(ok.calls[0]?.body).toEqual({
      phone_e164: '+998901234567',
      purpose: 'otp',
      provider: 'mock',
      provider_msg_id: null,
      status: 'failed',
      ip: null,
    });
    const failing = store({ status: 401, body: { message: 'bad key' } });
    await expect(
      failing.store.record({
        phone: '+998901234567',
        purpose: 'otp',
        provider: 'mock',
        status: 'sent',
        at: NOW,
      }),
    ).rejects.toThrow(/HTTP 401/);
  });
});

describe('parseDecision', () => {
  test('accepts the two shapes the SQL function returns and rejects the rest', () => {
    expect(parseDecision({ allowed: true })).toEqual({ allowed: true });
    expect(
      parseDecision({ allowed: false, scope: 'ip', rule: 'ip_1h', retry_after_sec: 1 }),
    ).toEqual({ allowed: false, scope: 'ip', rule: 'ip_1h', retryAfterSec: 1 });
    expect(() => parseDecision(null)).toThrow(SmsLogUnavailableError);
    expect(() => parseDecision({ allowed: false })).toThrow(SmsLogUnavailableError);
    expect(() =>
      parseDecision({ allowed: false, scope: 'user', rule: 'x', retry_after_sec: 1 }),
    ).toThrow(SmsLogUnavailableError);
  });
});
