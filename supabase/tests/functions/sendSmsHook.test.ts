import { InMemorySmsLog, type RateLimiter } from '../../functions/_shared/hooks/rateLimiter';
import { handleSendSms, type HookResponse } from '../../functions/_shared/hooks/sendSmsHook';
import { OTP_TEMPLATES } from '../../functions/_shared/hooks/smsTemplates';
import {
  encodeBase64,
  signStandardWebhook,
} from '../../functions/_shared/hooks/standardWebhooks';
import { createMemoryLogger } from '../../functions/_shared/log';
import { MockSmsProvider } from '../../functions/_shared/sms/MockSmsProvider';
import { SmsError } from '../../functions/_shared/sms/SmsProvider';

const NOW = new Date('2026-10-10T10:00:00Z');
const KEY = new TextEncoder().encode('0123456789abcdef0123456789abcdef');
const SECRET = `v1,whsec_${encodeBase64(KEY)}`;
const WRONG_SECRET = `v1,whsec_${encodeBase64(new TextEncoder().encode('ffffffffffffffffffffffffffffffff'))}`;
const PHONE = '998901234567';
const IP = '203.0.113.9';

interface RequestOptions {
  phone?: string;
  otp?: string;
  locale?: string;
  ip?: string;
  key?: Uint8Array;
  rawBody?: string;
}

async function signedRequest(options: RequestOptions = {}) {
  const rawBody =
    options.rawBody ??
    JSON.stringify({
      user: {
        id: 'f2d1c7e4-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
        phone: options.phone ?? PHONE,
        user_metadata: options.locale === undefined ? {} : { locale: options.locale },
      },
      sms: { otp: options.otp ?? '482913' },
      metadata: { ip_address: options.ip ?? IP },
    });
  const timestamp = Math.floor(NOW.getTime() / 1000);
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const signature = await signStandardWebhook(options.key ?? KEY, id, timestamp, rawBody);
  const headers = new Headers({
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `v1,${signature}`,
  });
  return { rawBody, headers };
}

function harness(options: { failWith?: SmsError; rateLimiter?: RateLimiter } = {}) {
  const providerLog = createMemoryLogger();
  const log = createMemoryLogger();
  const provider = new MockSmsProvider({ log: providerLog, failWith: options.failWith });
  const smsLog = new InMemorySmsLog();
  const run = async (request: { rawBody: string; headers: Headers }, secret = SECRET) =>
    handleSendSms({
      ...request,
      secret,
      provider,
      rateLimiter: options.rateLimiter ?? smsLog,
      sendLog: smsLog,
      log,
      now: () => NOW,
    });
  return { provider, smsLog, log, run };
}

function errorOf(response: HookResponse): { http_code: number; message: string } | undefined {
  return 'error' in response.body ? response.body.error : undefined;
}

describe('handleSendSms', () => {
  test('delivers the OTP, logs the send and answers 200 {}', async () => {
    const { provider, smsLog, log, run } = harness();
    const response = await run(await signedRequest());
    expect(response).toEqual({ status: 200, headers: {}, body: {} });

    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]).toMatchObject({
      to: '+998901234567',
      text: '1Heal: ваш код 482913. Никому не сообщайте его.',
      purpose: 'otp',
    });
    expect(smsLog.entries).toEqual([
      {
        phone: '+998901234567',
        purpose: 'otp',
        provider: 'mock',
        providerMessageId: 'mock-1',
        status: 'sent',
        ip: IP,
        at: NOW,
      },
    ]);
    expect(log.entries).toEqual([
      {
        level: 'info',
        event: 'sms_sent',
        phone_masked: '+99890*****67',
        provider: 'mock',
        locale: 'ru',
        provider_msg_id: 'mock-1',
        ms: 0,
      },
    ]);
    const serialized = JSON.stringify(log.entries);
    expect(serialized).not.toContain('482913');
    expect(serialized).not.toContain(PHONE);
  });

  test('picks the template of the user locale and accepts custom templates', async () => {
    const { provider, run } = harness();
    await run(await signedRequest({ locale: 'uz' }));
    expect(provider.sent[0]?.text).toBe('1Heal: sizning kodingiz 482913. Uni hech kimga aytmang.');

    const custom = { ...OTP_TEMPLATES, en: 'Code {{otp}} from {{brand}}' };
    const request = await signedRequest({ locale: 'en' });
    const response = await handleSendSms({
      ...request,
      secret: SECRET,
      provider,
      rateLimiter: new InMemorySmsLog(),
      sendLog: new InMemorySmsLog(),
      templates: custom,
      log: createMemoryLogger(),
      now: () => NOW,
    });
    expect(response.status).toBe(200);
    expect(provider.sent[1]?.text).toBe('Code 482913 from 1Heal');
  });

  test('rate limits the fourth request for a phone with a 429 the end user can act on', async () => {
    const { provider, smsLog, log, run } = harness();
    for (let i = 0; i < 3; i += 1) {
      expect((await run(await signedRequest())).status).toBe(200);
    }
    const response = await run(await signedRequest());
    expect(response.status).toBe(200);
    expect(errorOf(response)).toEqual({
      http_code: 429,
      message: 'Too many SMS requests, you can only request this after 600 seconds.',
    });
    expect(provider.sent).toHaveLength(3);
    expect(smsLog.entries.at(-1)).toMatchObject({ status: 'rate_limited', providerMessageId: undefined });
    expect(log.entries.at(-1)).toMatchObject({
      level: 'info',
      event: 'sms_rate_limited',
      scope: 'phone',
      rule: 'phone_10m',
      retryAfterSec: 600,
      phone_masked: '+99890*****67',
    });
  });

  test('rejects a request signed with another secret before touching anything', async () => {
    const { provider, smsLog, log, run } = harness();
    const response = await run(await signedRequest(), WRONG_SECRET);
    expect(response.status).toBe(401);
    expect(errorOf(response)).toEqual({ http_code: 401, message: 'Invalid webhook signature' });
    expect(provider.sent).toHaveLength(0);
    expect(smsLog.entries).toHaveLength(0);
    expect(log.entries[0]).toMatchObject({
      level: 'warn',
      event: 'sms_hook_signature_rejected',
      reason: 'no_matching_signature',
    });
  });

  test('rejects a signed but invalid payload with 400', async () => {
    const { provider, log, run } = harness();
    const response = await run(await signedRequest({ otp: 'abc' }));
    expect(response.status).toBe(400);
    expect(errorOf(response)?.message).toBe('Invalid payload: sms.otp must be 4 to 10 digits');
    expect(provider.sent).toHaveLength(0);
    expect(log.entries[0]).toMatchObject({ event: 'sms_hook_payload_rejected' });
  });

  test('fails closed with a retryable 503 when the rate limiter is unreachable', async () => {
    const rateLimiter: RateLimiter = {
      check: async () => {
        throw new Error('connection refused');
      },
    };
    const { provider, log, run } = harness({ rateLimiter });
    const response = await run(await signedRequest());
    expect(response).toEqual({
      status: 503,
      headers: { 'retry-after': '1' },
      body: { error: { http_code: 503, message: 'SMS rate limiter unavailable' } },
    });
    expect(provider.sent).toHaveLength(0);
    expect(log.entries[0]).toMatchObject({
      level: 'error',
      event: 'sms_rate_limit_unavailable',
      error: 'Error: connection refused',
    });
  });

  test.each([
    ['PROVIDER_DOWN', 503, 503, 'SMS service temporarily unavailable', { 'retry-after': '1' }],
    ['RATE_LIMIT', 503, 503, 'SMS service temporarily unavailable', { 'retry-after': '1' }],
    ['INVALID_NUMBER', 200, 400, 'Invalid phone number', {}],
    ['AUTH', 200, 500, 'SMS delivery failed', {}],
    ['UNKNOWN', 200, 500, 'SMS delivery failed', {}],
  ] as const)(
    'maps a provider %s error to the hook contract',
    async (code, status, httpCode, message, headers) => {
      const { smsLog, log, run } = harness({ failWith: new SmsError(code, 'provider said no') });
      const response = await run(await signedRequest());
      expect(response).toEqual({
        status,
        headers,
        body: { error: { http_code: httpCode, message } },
      });
      expect(smsLog.entries).toEqual([
        expect.objectContaining({ status: 'failed', provider: 'mock', phone: '+998901234567' }),
      ]);
      expect(log.entries.at(-1)).toMatchObject({
        level: 'error',
        event: 'sms_send_failed',
        code,
        error: 'SmsError: provider said no',
        provider: 'mock',
      });
    },
  );

  test('a failing send log never turns a delivered SMS into an error', async () => {
    const { provider, log, run } = harness();
    const request = await signedRequest();
    const response = await handleSendSms({
      ...request,
      secret: SECRET,
      provider,
      rateLimiter: new InMemorySmsLog(),
      sendLog: {
        record: async () => {
          throw new Error('insert failed');
        },
      },
      log,
      now: () => NOW,
    });
    expect(response).toEqual({ status: 200, headers: {}, body: {} });
    expect(log.entries.map((entry) => entry.event)).toEqual(['sms_send_log_failed', 'sms_sent']);
  });

  test('counts failed deliveries against the phone limit', async () => {
    const { run, smsLog } = harness({ failWith: new SmsError('UNKNOWN', 'x') });
    for (let i = 0; i < 3; i += 1) await run(await signedRequest());
    const response = await run(await signedRequest());
    expect(errorOf(response)?.http_code).toBe(429);
    expect(smsLog.entries.map((entry) => entry.status)).toEqual([
      'failed',
      'failed',
      'failed',
      'rate_limited',
    ]);
  });
});
