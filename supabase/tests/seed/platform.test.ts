/**
 * Seed platform rows and the seed file itself: feature flags mapped to the app flags, seed.sql
 * matches its generator, and re-running seed.sql is a no-op.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { type DbClient, runInTransaction } from '../_harness/db';
import { rows } from './helpers';

const SUPABASE_DIR = path.resolve(__dirname, '..', '..');
const SEED_SQL = path.join(SUPABASE_DIR, 'seed.sql');
const GENERATOR = path.join(SUPABASE_DIR, 'seed', 'generate.mjs');

describe('seed: platform', () => {
  test('feature flags map to the app flags (src/shared/config/featureFlags.ts)', async () => {
    const flags = await rows<{
      key: string;
      enabled: boolean;
      app_key: string | null;
      value: unknown;
    }>(
      `select key, enabled, payload ->> 'app_key' as app_key, payload -> 'value' as value
       from public.feature_flags order by key`,
    );
    const byAppKey = Object.fromEntries(
      flags.filter((f) => f.app_key).map((f) => [f.app_key, f.value]),
    );
    expect(byAppKey).toEqual({
      'payments.payme': false,
      'payments.click': false,
      'payments.uzum': false,
      partnerMode: true,
      waitlist: true,
      freeze: true,
      newUserPromo: false,
      'maps.provider': 'yandex',
    });
    expect(flags.every((f) => typeof f.value !== 'boolean' || f.value === f.enabled)).toBe(true);
  });
});

describe('seed: the seed file', () => {
  test('seed.sql is the current output of supabase/seed/generate.mjs', () => {
    const result = spawnSync(process.execPath, [GENERATOR, '--check'], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  test('re-running seed.sql changes nothing (idempotent)', async () => {
    const snapshot = async (client: DbClient) =>
      (
        await client.query<{ digest: string }>(
          `select md5(concat_ws('|',
             (select count(*) from auth.users), (select count(*) from public.profiles),
             (select string_agg(concat_ws(':', id, locale, terms_accepted_at), ',' order by id) from public.profiles),
             (select string_agg(concat_ws(':', id, status, visits_used), ',' order by id) from public.subscriptions),
             (select string_agg(concat_ws(':', id, status), ',' order by id) from public.bookings),
             (select string_agg(concat_ws(':', id, booked_count, waitlist_count), ',' order by id) from public.class_sessions),
             (select string_agg(concat_ws(':', id, status, paid_at), ',' order by id) from public.payments),
             (select string_agg(concat_ws(':', id, created_at), ',' order by id) from public.booking_events),
             (select string_agg(concat_ws(':', id, created_at), ',' order by id) from public.payment_events),
             (select string_agg(concat_ws(':', id, created_at), ',' order by id) from public.subscription_events),
             (select string_agg(concat_ws(':', slug, rating_avg, rating_count), ',' order by slug) from public.venues),
             (select count(*) from public.visits), (select count(*) from public.reviews),
             (select count(*) from public.notifications), (select count(*) from public.favorites))) as digest`,
        )
      ).rows[0]!.digest;
    await runInTransaction(async (client) => {
      const before = await snapshot(client);
      await client.query(readFileSync(SEED_SQL, 'utf8'));
      expect(await snapshot(client)).toBe(before);
    });
  }, 60_000);
});
