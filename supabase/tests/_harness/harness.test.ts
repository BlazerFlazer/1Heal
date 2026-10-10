import { randomUUID } from 'node:crypto';

import {
  asAnon,
  asService,
  asUser,
  createAuthUser,
  expectDenied,
  expectErrorCode,
  getPool,
  resetRole,
  runInTransaction,
} from './db';

describe('database harness', () => {
  test('database is reachable, PostgreSQL 17, UTF8, with the harness migration ledger', async () => {
    const { rows } = await getPool().query<{ version: number; encoding: string; ledger: boolean }>(
      `select current_setting('server_version_num')::int as version,
              current_setting('server_encoding') as encoding,
              to_regclass('harness.schema_migrations') is not null as ledger`,
    );
    expect(rows[0]?.version).toBeGreaterThanOrEqual(170000);
    expect(rows[0]?.encoding).toBe('UTF8');
    expect(rows[0]?.ledger).toBe(true);
  });

  test('auth helpers, auth.users and the Data API roles exist (shim or Supabase)', async () => {
    await runInTransaction(async (client) => {
      const functions = await client.query<{ proname: string }>(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'auth' and p.proname in ('uid', 'role', 'jwt') order by 1`,
      );
      expect(functions.rows.map((row) => row.proname)).toEqual(['jwt', 'role', 'uid']);

      const users = await client.query<{ ok: boolean }>(
        `select to_regclass('auth.users') is not null as ok`,
      );
      expect(users.rows[0]?.ok).toBe(true);

      const roles = await client.query<{ rolname: string; rolbypassrls: boolean }>(
        `select rolname, rolbypassrls from pg_roles
         where rolname in ('anon', 'authenticated', 'service_role') order by rolname`,
      );
      expect(roles.rows).toEqual([
        { rolname: 'anon', rolbypassrls: false },
        { rolname: 'authenticated', rolbypassrls: false },
        { rolname: 'service_role', rolbypassrls: true },
      ]);
    });
  });

  test('JWT claims round-trip through set_config into auth.uid()/auth.role()/auth.jwt()', async () => {
    await runInTransaction(async (client) => {
      const sub = randomUUID();
      await asUser(client, { sub, roles: ['member', 'partner'], phone: '998901234567' });
      const asMember = await client.query(
        `select auth.uid()::text as uid, auth.role() as role, current_user as who,
                auth.jwt() -> 'app_metadata' -> 'roles' as roles`,
      );
      expect(asMember.rows[0]).toEqual({
        uid: sub,
        role: 'authenticated',
        who: 'authenticated',
        roles: ['member', 'partner'],
      });

      await asAnon(client);
      const asGuest = await client.query('select auth.uid() as uid, current_user as who');
      expect(asGuest.rows[0]).toEqual({ uid: null, who: 'anon' });

      await resetRole(client);
      const asOwner = await client.query('select auth.uid() as uid, auth.jwt() as jwt');
      expect(asOwner.rows[0]).toEqual({ uid: null, jwt: null });
    });
  });

  test('RLS denies by default on a throwaway table and expectDenied detects it', async () => {
    await runInTransaction(async (client) => {
      await client.query('create table public.harness_probe (id int primary key, owner uuid)');
      await client.query('alter table public.harness_probe enable row level security');
      await client.query(
        'grant select, insert on public.harness_probe to anon, authenticated, service_role',
      );
      await client.query('insert into public.harness_probe values (1, $1)', [randomUUID()]);

      await asUser(client, { sub: randomUUID() });
      await expectDenied(client.query('select * from public.harness_probe'));
      await expectDenied(
        () => client.query('insert into public.harness_probe values (2, auth.uid())'),
        client,
      );
      await expectErrorCode(
        () => client.query(`select * from public.table_that_does_not_exist`),
        '42P01',
        client,
      );

      await asService(client);
      const visible = await client.query<{ n: number }>(
        'select count(*)::int as n from public.harness_probe',
      );
      expect(visible.rows[0]?.n).toBe(1);
    });
  });

  test('runInTransaction rolled the probe table back', async () => {
    const { rows } = await getPool().query<{ probe: string | null }>(
      `select to_regclass('public.harness_probe')::text as probe`,
    );
    expect(rows[0]?.probe).toBeNull();
  });

  test('createAuthUser inserts a confirmed phone user', async () => {
    await runInTransaction(async (client) => {
      const user = await createAuthUser(client);
      const { rows } = await client.query(
        `select phone, phone_confirmed_at is not null as confirmed,
                raw_app_meta_data -> 'providers' as providers
         from auth.users where id = $1`,
        [user.id],
      );
      expect(rows[0]).toEqual({ phone: user.phone, confirmed: true, providers: ['phone'] });
      expect(user.phoneE164).toBe(`+${user.phone}`);
    });
  });

  test('cube + earthdistance are available in schema extensions', async () => {
    await runInTransaction(async (client) => {
      await client.query('create extension if not exists cube with schema extensions');
      await client.query('create extension if not exists earthdistance with schema extensions');
      // Tashkent: Amir Temur square -> Chorsu bazaar, about 3.5 km apart.
      const { rows } = await client.query<{ meters: string }>(
        `select earth_distance(ll_to_earth(41.3111, 69.2797), ll_to_earth(41.3262, 69.2353)) as meters`,
      );
      expect(Number(rows[0]?.meters)).toBeGreaterThan(3000);
      expect(Number(rows[0]?.meters)).toBeLessThan(5000);
    });
  });
});
