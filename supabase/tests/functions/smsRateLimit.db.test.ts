/**
 * public.sms_rate_limit_check (supabase/migrations/0090_sms_send_log_policies.sql): the Postgres
 * side of the auth-sms-hook rate limiter, called through the Data API with the service role.
 */
import { randomUUID } from 'node:crypto';

import {
  asAnon,
  asService,
  asUser,
  type DbClient,
  expectDenied,
  runInTransaction,
} from '../_harness/db';

const NOW = '2026-10-10T10:00:00Z';
const NOW_MS = Date.parse(NOW);
const PHONE = '+998901234567';
const OTHER_PHONE = '+998937654321';
const IP = '203.0.113.9';

interface Row {
  phone?: string;
  ip?: string | null;
  status?: 'sent' | 'failed' | 'rate_limited';
  purpose?: string;
  minutesAgo: number;
}

type Decision =
  | { allowed: true }
  | { allowed: false; scope: 'phone' | 'ip'; rule: string; retry_after_sec: number };

async function insertRows(client: DbClient, rows: Row[]): Promise<void> {
  for (const row of rows) {
    await client.query(
      `insert into public.sms_send_log (phone_e164, purpose, provider, status, ip, created_at)
       values ($1, $2, 'test', $3, $4, $5)`,
      [
        row.phone ?? PHONE,
        row.purpose ?? 'otp',
        row.status ?? 'sent',
        row.ip === undefined ? IP : row.ip,
        new Date(NOW_MS - row.minutesAgo * 60_000).toISOString(),
      ],
    );
  }
}

async function check(
  client: DbClient,
  options: { phone?: string; ip?: string | null; purpose?: string } = {},
): Promise<Decision> {
  const { rows } = await client.query<{ decision: Decision }>(
    `select public.sms_rate_limit_check($1, $2, $3, $4::timestamptz) as decision`,
    [options.phone ?? PHONE, options.ip === undefined ? IP : options.ip, options.purpose ?? 'otp', NOW],
  );
  const decision = rows[0]?.decision;
  if (decision === undefined) throw new Error('no decision returned');
  return decision;
}

describe('sms_rate_limit_check', () => {
  test('allows a phone with no history', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await expect(check(client)).resolves.toEqual({ allowed: true });
    });
  });

  test('blocks the 4th attempt within 10 minutes and says when the oldest one expires', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await insertRows(client, [{ minutesAgo: 1 }, { minutesAgo: 3 }]);
      await expect(check(client)).resolves.toEqual({ allowed: true });
      await insertRows(client, [{ minutesAgo: 0.5, status: 'failed' }]);
      await expect(check(client)).resolves.toEqual({
        allowed: false,
        scope: 'phone',
        rule: 'phone_10m',
        retry_after_sec: 7 * 60,
      });
    });
  });

  test('ignores attempts outside the window, rate-limited rows, other purposes and phones', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await insertRows(client, [
        { minutesAgo: 11 },
        { minutesAgo: 1 },
        { minutesAgo: 2, status: 'rate_limited' },
        { minutesAgo: 3, purpose: 'notice' },
        { minutesAgo: 4, phone: OTHER_PHONE },
        { minutesAgo: -1 }, // clock skew: a row from the future is not counted
      ]);
      await expect(check(client)).resolves.toEqual({ allowed: true });
      await expect(check(client, { purpose: 'notice' })).resolves.toEqual({ allowed: true });
    });
  });

  test('blocks the 11th attempt of a day even with a clear 10 minute window', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await insertRows(
        client,
        Array.from({ length: 10 }, (_, i) => ({ minutesAgo: 15 * (i + 1) })),
      );
      await expect(check(client)).resolves.toEqual({
        allowed: false,
        scope: 'phone',
        rule: 'phone_24h',
        retry_after_sec: 24 * 3600 - 150 * 60,
      });
    });
  });

  test('blocks an IP after 20 attempts across phones in an hour; unknown IPs are skipped', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await insertRows(
        client,
        Array.from({ length: 20 }, (_, i) => ({
          minutesAgo: 2 * (i + 1),
          phone: `+99890${String(i).padStart(7, '0')}`,
        })),
      );
      await expect(check(client)).resolves.toEqual({
        allowed: false,
        scope: 'ip',
        rule: 'ip_1h',
        retry_after_sec: 3600 - 40 * 60,
      });
      await expect(check(client, { ip: '198.51.100.1' })).resolves.toEqual({ allowed: true });
      await expect(check(client, { ip: null })).resolves.toEqual({ allowed: true });
      await expect(check(client, { ip: 'unknown' })).resolves.toEqual({ allowed: true });
      await expect(check(client, { ip: '' })).resolves.toEqual({ allowed: true });
    });
  });

  test('with more attempts than the limit, waits for enough of them to expire', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await insertRows(client, [1, 2, 3, 4, 5].map((minutesAgo) => ({ minutesAgo })));
      // 5 attempts, limit 3: the third oldest (3 min ago) must leave the 10 min window.
      await expect(check(client)).resolves.toEqual({
        allowed: false,
        scope: 'phone',
        rule: 'phone_10m',
        retry_after_sec: 7 * 60,
      });
    });
  });

  test('refuses an empty phone', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await expect(check(client, { phone: '' })).rejects.toMatchObject({ code: '22023' });
    });
  });

  test('only the service role may call it or touch sms_send_log', async () => {
    await runInTransaction(async (client) => {
      await asService(client);
      await insertRows(client, [{ minutesAgo: 1 }]);

      await asAnon(client);
      await expectDenied(() => check(client), client);
      await expectDenied(() => client.query('select * from public.sms_send_log'), client);

      await asUser(client, { sub: randomUUID(), roles: ['member', 'admin'] });
      await expectDenied(() => check(client), client);
      await expectDenied(() => client.query('select * from public.sms_send_log'), client);
      await expectDenied(
        () =>
          client.query(
            `insert into public.sms_send_log (phone_e164, purpose, provider, status)
             values ($1, 'otp', 'test', 'sent')`,
            [PHONE],
          ),
        client,
      );

      await asService(client);
      const { rows } = await client.query<{ n: number }>(
        'select count(*)::int as n from public.sms_send_log where phone_e164 = $1',
        [PHONE],
      );
      expect(rows[0]?.n).toBe(1);
    });
  });
});
