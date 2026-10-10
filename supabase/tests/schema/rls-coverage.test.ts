/**
 * Automatic RLS coverage: every table in schema public is discovered from the catalog, so a new
 * table cannot ship without row level security or with an unintended anon read.
 */
import { asAnon, expectDenied, getPool, runInTransaction } from '../_harness/db';

/** Tables anon may read (filtered by their policies). Any other table must deny anon entirely. */
const ANON_READABLE = [
  'class_sessions',
  'class_templates',
  'plans',
  'reviews',
  'trainers',
  'venue_categories',
  'venue_hours',
  'venue_photos',
  'venues',
].sort();

async function publicTables(): Promise<string[]> {
  const { rows } = await getPool().query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  );
  return rows.map((row) => row.tablename);
}

describe('RLS coverage of schema public', () => {
  test('the schema has the tables from docs/PLAN.md section 3', async () => {
    const tables = await publicTables();
    expect(tables).toEqual(
      expect.arrayContaining([
        'profiles',
        'user_roles',
        'venue_staff',
        'devices',
        'consents',
        'sms_send_log',
        'venue_categories',
        'venues',
        'venue_photos',
        'venue_hours',
        'trainers',
        'class_templates',
        'class_sessions',
        'favorites',
        'plans',
        'subscriptions',
        'subscription_freezes',
        'subscription_events',
        'payments',
        'payment_events',
        'payment_methods',
        'webhook_inbox',
        'payouts',
        'bookings',
        'booking_events',
        'visits',
        'qr_tokens',
        'checkin_attempts',
        'penalties',
        'reviews',
        'review_reports',
        'notifications',
        'notification_preferences',
        'feature_flags',
        'audit_log',
        'account_deletion_requests',
      ]),
    );
    expect(tables.length).toBeGreaterThanOrEqual(36);
  });

  test('every public table has row level security enabled', async () => {
    const { rows } = await getPool().query<{ tablename: string }>(
      `select c.relname as tablename
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
       order by 1`,
    );
    expect(rows.map((row) => row.tablename)).toEqual([]);
  });

  test('anon has no insert/update/delete policy on any table', async () => {
    const { rows } = await getPool().query<{ tablename: string; cmd: string }>(
      `select tablename, cmd from pg_policies
       where schemaname = 'public' and 'anon' = any (roles) and cmd <> 'SELECT'
       order by 1, 2`,
    );
    expect(rows).toEqual([]);
  });

  test('anon select policies exist only on the public catalog tables', async () => {
    const { rows } = await getPool().query<{ tablename: string }>(
      `select distinct tablename from pg_policies
       where schemaname = 'public' and 'anon' = any (roles) order by 1`,
    );
    expect(rows.map((row) => row.tablename)).toEqual(ANON_READABLE);
  });

  test('anon select on every non-catalog table is denied (no grant or no rows)', async () => {
    const tables = (await publicTables()).filter((name) => !ANON_READABLE.includes(name));
    expect(tables.length).toBeGreaterThan(20);
    await runInTransaction(async (client) => {
      await asAnon(client);
      for (const table of tables) {
        await expectDenied(
          () => client.query(`select * from public.${client.escapeIdentifier(table)} limit 1`),
          client,
        );
      }
    });
  });

  test('anon cannot write to catalog tables even where it may read', async () => {
    await runInTransaction(async (client) => {
      await asAnon(client);
      for (const table of ANON_READABLE) {
        await expectDenied(
          () => client.query(`delete from public.${client.escapeIdentifier(table)}`),
          client,
        );
      }
    });
  });

  test('the migration ledger is private (schema harness, not public)', async () => {
    const { rows } = await getPool().query<{ ok: boolean }>(
      `select to_regclass('public.schema_migrations') is null as ok`,
    );
    expect(rows[0]?.ok).toBe(true);
  });
});
