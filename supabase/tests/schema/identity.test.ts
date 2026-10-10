import { randomUUID } from 'node:crypto';

import {
  asUser,
  createAuthUser,
  expectErrorCode,
  resetRole,
  runInTransaction,
} from '../_harness/db';
import { createMember, grantRole, i18n } from './fixtures';

describe('identity triggers and helpers', () => {
  test('inserting into auth.users creates a profile (+phone) and the member role', async () => {
    await runInTransaction(async (client) => {
      const user = await createAuthUser(client, { userMetadata: { full_name: 'Aziza' } });
      const profile = await client.query(
        `select phone_e164, full_name, locale, theme from public.profiles where id = $1`,
        [user.id],
      );
      expect(profile.rows[0]).toEqual({
        phone_e164: user.phoneE164,
        full_name: 'Aziza',
        locale: 'ru',
        theme: 'system',
      });
      const roles = await client.query<{ role: string }>(
        `select role from public.user_roles where user_id = $1`,
        [user.id],
      );
      expect(roles.rows.map((row) => row.role)).toEqual(['member']);
    });
  });

  test('changing auth.users.phone updates profiles.phone_e164', async () => {
    await runInTransaction(async (client) => {
      const user = await createAuthUser(client);
      await client.query(`update auth.users set phone = '998971112233' where id = $1`, [user.id]);
      const { rows } = await client.query<{ phone_e164: string }>(
        `select phone_e164 from public.profiles where id = $1`,
        [user.id],
      );
      expect(rows[0]?.phone_e164).toBe('+998971112233');
    });
  });

  test('set_updated_at bumps updated_at on update', async () => {
    await runInTransaction(async (client) => {
      const user = await createAuthUser(client);
      await client.query(
        `update public.profiles set updated_at = now() - interval '1 day' where id = $1`,
        [user.id],
      );
      // The trigger overrides the explicit value with now().
      const { rows } = await client.query<{ fresh: boolean }>(
        `select updated_at >= now() - interval '1 minute' as fresh from public.profiles where id = $1`,
        [user.id],
      );
      expect(rows[0]?.fresh).toBe(true);

      await client.query(`update public.profiles set full_name = 'B' where id = $1`, [user.id]);
      const after = await client.query<{ same: boolean }>(
        `select updated_at = now() as same from public.profiles where id = $1`,
        [user.id],
      );
      expect(after.rows[0]?.same).toBe(true);
    });
  });

  test('custom_access_token_hook merges app_metadata.roles from user_roles', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      await grantRole(client, user.id, 'partner');
      const event = {
        user_id: user.id,
        authentication_method: 'otp',
        claims: {
          sub: user.id,
          role: 'authenticated',
          aud: 'authenticated',
          app_metadata: { provider: 'phone', providers: ['phone'] },
        },
      };
      await client.query('set local role supabase_auth_admin');
      const { rows } = await client.query<{ out: typeof event }>(
        `select public.custom_access_token_hook($1::jsonb) as out`,
        [JSON.stringify(event)],
      );
      const claims = rows[0]!.out.claims as Record<string, unknown>;
      expect(claims.sub).toBe(user.id);
      expect(claims.role).toBe('authenticated');
      expect(claims.app_metadata).toEqual({
        provider: 'phone',
        providers: ['phone'],
        roles: ['member', 'partner'],
      });
    });
  });

  test('custom_access_token_hook returns [] roles for an unknown user and keeps the event', async () => {
    await runInTransaction(async (client) => {
      await client.query('set local role supabase_auth_admin');
      const { rows } = await client.query<{ out: Record<string, unknown> }>(
        `select public.custom_access_token_hook($1::jsonb) as out`,
        [JSON.stringify({ user_id: randomUUID(), claims: { sub: 'x' } })],
      );
      expect(rows[0]?.out).toEqual({
        user_id: expect.any(String),
        claims: { sub: 'x', app_metadata: { roles: [] } },
      });
    });
  });

  test('custom_access_token_hook is not executable by authenticated or anon', async () => {
    await runInTransaction(async (client) => {
      await asUser(client, { sub: randomUUID() });
      await expectErrorCode(
        () => client.query(`select public.custom_access_token_hook('{}'::jsonb)`),
        '42501',
        client,
      );
    });
  });

  test('app_role()/has_role()/is_admin() read app_metadata.roles from the JWT', async () => {
    await runInTransaction(async (client) => {
      await asUser(client, { sub: randomUUID(), roles: ['member', 'admin'] });
      const admin = await client.query(
        `select public.app_role() as roles, public.has_role('partner') as partner, public.is_admin() as admin`,
      );
      expect(admin.rows[0]).toEqual({ roles: ['member', 'admin'], partner: false, admin: true });

      await resetRole(client);
      const none = await client.query(
        `select public.app_role() as roles, public.is_admin() as admin`,
      );
      expect(none.rows[0]).toEqual({ roles: [], admin: false });
    });
  });

  test('jsonb_i18n_valid requires a non-empty "ru" and string uz/en', async () => {
    await runInTransaction(async (client) => {
      const { rows } = await client.query<{ a: boolean; b: boolean; c: boolean; d: boolean }>(
        `select public.jsonb_i18n_valid($1::jsonb) as a, public.jsonb_i18n_valid('{"uz":"x"}') as b,
                public.jsonb_i18n_valid('{"ru":""}') as c, public.jsonb_i18n_valid('{"ru":"x","en":1}') as d`,
        [i18n('Привет')],
      );
      expect(rows[0]).toEqual({ a: true, b: false, c: false, d: false });
    });
  });

  test('i18n check constraints reject a category name without ru', async () => {
    await runInTransaction(async (client) => {
      await expectErrorCode(
        () =>
          client.query(
            `insert into public.venue_categories (slug, name, icon) values ('no-ru', '{"en":"Gym"}', 'x')`,
          ),
        '23514',
        client,
      );
    });
  });
});
