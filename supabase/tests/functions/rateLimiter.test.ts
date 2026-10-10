import {
  evaluateRules,
  InMemorySmsLog,
  SMS_RATE_LIMITS,
  type SmsLogEntry,
  type SmsLogStatus,
} from '../../functions/_shared/hooks/rateLimiter';

const NOW = new Date('2026-10-10T10:00:00Z');
const PHONE = '+998901234567';
const OTHER_PHONE = '+998937654321';
const IP = '203.0.113.9';
const MINUTE = 60_000;

function entry(
  minutesAgo: number,
  overrides: Partial<SmsLogEntry> & { status?: SmsLogStatus } = {},
): SmsLogEntry {
  return {
    phone: PHONE,
    purpose: 'otp',
    provider: 'mock',
    status: 'sent',
    ip: IP,
    at: new Date(NOW.getTime() - minutesAgo * MINUTE),
    ...overrides,
  };
}

async function logWith(entries: SmsLogEntry[]): Promise<InMemorySmsLog> {
  const log = new InMemorySmsLog();
  for (const item of entries) await log.record(item);
  return log;
}

describe('SMS_RATE_LIMITS', () => {
  test('mirrors the policy in supabase/migrations/0090_sms_send_log_policies.sql', () => {
    expect(SMS_RATE_LIMITS).toEqual([
      { scope: 'phone', rule: 'phone_10m', max: 3, windowSec: 600 },
      { scope: 'phone', rule: 'phone_24h', max: 10, windowSec: 86_400 },
      { scope: 'ip', rule: 'ip_1h', max: 20, windowSec: 3600 },
    ]);
  });
});

describe('InMemorySmsLog as a rate limiter', () => {
  test('allows the first three sends to a phone within 10 minutes and blocks the fourth', async () => {
    const log = await logWith([entry(1), entry(3)]);
    await expect(log.check({ phone: PHONE, ip: IP, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: true,
    });
    await log.record(entry(0.5));
    await expect(log.check({ phone: PHONE, ip: IP, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: false,
      scope: 'phone',
      rule: 'phone_10m',
      retryAfterSec: 7 * 60,
    });
  });

  test('frees the phone once the oldest attempt leaves the 10 minute window', async () => {
    const log = await logWith([entry(11), entry(3), entry(1)]);
    await expect(log.check({ phone: PHONE, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: true,
    });
  });

  test('counts failed attempts, not rate-limited ones, other purposes or other phones', async () => {
    const log = await logWith([
      entry(1, { status: 'failed' }),
      entry(2, { status: 'failed' }),
      entry(3, { status: 'rate_limited' }),
      entry(4, { purpose: 'notice' }),
      entry(5, { phone: OTHER_PHONE }),
    ]);
    await expect(log.check({ phone: PHONE, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: true,
    });
    await log.record(entry(0.1, { status: 'failed' }));
    const decision = await log.check({ phone: PHONE, purpose: 'otp', now: NOW });
    expect(decision.allowed).toBe(false);
  });

  test('blocks the 11th send of a day even when the 10 minute window is clear', async () => {
    const log = await logWith(Array.from({ length: 10 }, (_, i) => entry(15 * (i + 1))));
    await expect(log.check({ phone: PHONE, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: false,
      scope: 'phone',
      rule: 'phone_24h',
      retryAfterSec: 24 * 3600 - 150 * 60,
    });
  });

  test('blocks an IP after 20 sends to different phones in an hour; no IP means no IP rule', async () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      entry(2 * (i + 1), { phone: `+99890${String(i).padStart(7, '0')}` }),
    );
    const log = await logWith(entries);
    await expect(log.check({ phone: PHONE, ip: IP, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: false,
      scope: 'ip',
      rule: 'ip_1h',
      retryAfterSec: 3600 - 40 * 60,
    });
    await expect(
      log.check({ phone: PHONE, ip: '198.51.100.1', purpose: 'otp', now: NOW }),
    ).resolves.toEqual({ allowed: true });
    await expect(log.check({ phone: PHONE, purpose: 'otp', now: NOW })).resolves.toEqual({
      allowed: true,
    });
  });

  test('record keeps its own copy of the entry', async () => {
    const log = new InMemorySmsLog();
    const item = entry(1);
    await log.record(item);
    item.status = 'rate_limited';
    expect(log.entries[0]?.status).toBe('sent');
  });
});

describe('evaluateRules', () => {
  const rule = { scope: 'phone', rule: 'phone_10m', max: 3, windowSec: 600 } as const;

  test('ignores attempts outside the window and in the future', () => {
    const now = NOW.getTime();
    const timestamps = [now - 601_000, now - 10_000, now - 5_000, now + 1_000];
    expect(evaluateRules(timestamps, [rule], now)).toEqual({ allowed: true });
  });

  test('with more attempts than the limit, waits for enough of them to expire', () => {
    const now = NOW.getTime();
    const timestamps = [now - 500_000, now - 400_000, now - 300_000, now - 200_000, now - 100_000];
    // 5 attempts, limit 3: the third oldest (300 s ago) must leave the 600 s window.
    expect(evaluateRules(timestamps, [rule], now)).toEqual({
      allowed: false,
      scope: 'phone',
      rule: 'phone_10m',
      retryAfterSec: 300,
    });
  });

  test('never returns less than one second', () => {
    const now = NOW.getTime();
    const timestamps = [now - 599_900, now - 100, now - 50];
    expect(evaluateRules(timestamps, [rule], now)).toMatchObject({ retryAfterSec: 1 });
  });
});
