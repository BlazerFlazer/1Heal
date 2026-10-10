/**
 * Shared constants and read helpers for the seed tests. The harness applies supabase/seed.sql in
 * its global setup; these tests only read committed seed data (other suites roll back their own
 * rows, so they never show up here).
 */
import { getPool } from '../_harness/db';

/** supabase/seed/lib/time.mjs ANCHOR_DATE: Monday 2026-10-12 00:00 Asia/Tashkent. */
export const ANCHOR = '2026-10-12T00:00:00+05:00';

/** Amir Temur square, the centre used by the "nearby" checks. */
export const CITY_CENTRE = { lat: 41.311, lng: 69.279 };

export const PHONES = {
  admin: '+998900000000',
  staff: ['+998901234500', '+998901234600', '+998901234700', '+998901234800', '+998901234900'],
  featured: {
    standardActive: '+998901000001',
    basicNearQuota: '+998901000002',
    premiumWaitlisted: '+998901000003',
    frozen: '+998901000004',
    noSubscription: '+998901000005',
    penalised: '+998901000006',
    pendingPayment: '+998901000007',
    scheduledDowngrade: '+998901000008',
  },
} as const;

export async function rows<T extends object>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await getPool().query<T>(sql, params)).rows;
}

export async function one<T extends object>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await rows<T>(sql, params);
  if (result.length !== 1) throw new Error(`expected one row, got ${result.length}: ${sql}`);
  return result[0]!;
}
