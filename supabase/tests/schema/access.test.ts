import { randomUUID } from 'node:crypto';

import {
  asAnon,
  asUser,
  type DbClient,
  expectDenied,
  resetRole,
  runInTransaction,
} from '../_harness/db';
import {
  addVenueStaff,
  createBooking,
  createMember,
  createPayment,
  createReview,
  createSubscription,
  createVenue,
  grantRole,
} from './fixtures';

const count = async (client: DbClient, sql: string, params: unknown[] = []) =>
  (await client.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`, params)).rows[0]!
    .n;

describe('owner-only access', () => {
  test('profiles: owner reads and updates own row, not another member; admin reads all', async () => {
    await runInTransaction(async (client) => {
      const alice = await createMember(client);
      const bob = await createMember(client);
      const admin = await createMember(client);
      await grantRole(client, admin.id, 'admin');

      await asUser(client, { sub: alice.id });
      expect(await count(client, 'select 1 from public.profiles')).toBe(1);
      await expectDenied(client.query('select * from public.profiles where id = $1', [bob.id]));
      const own = await client.query(
        `update public.profiles set full_name = 'Alice' where id = $1 returning full_name`,
        [alice.id],
      );
      expect(own.rows[0]).toEqual({ full_name: 'Alice' });
      await expectDenied(
        client.query(`update public.profiles set full_name = 'X' where id = $1`, [bob.id]),
      );
      await expectDenied(
        () => client.query(`insert into public.profiles (id) values ($1)`, [randomUUID()]),
        client,
      );

      await asUser(client, { sub: admin.id, roles: ['member', 'admin'] });
      expect(await count(client, 'select 1 from public.profiles')).toBeGreaterThanOrEqual(3);
    });
  });

  test('subscriptions and payments: owner reads own rows only and cannot write', async () => {
    await runInTransaction(async (client) => {
      const alice = await createMember(client);
      const bob = await createMember(client);
      const aliceSub = await createSubscription(client, alice.id);
      await createSubscription(client, bob.id);
      const alicePayment = await createPayment(client, alice.id);
      await createPayment(client, bob.id);

      await asUser(client, { sub: alice.id });
      const subs = await client.query<{ id: string }>('select id from public.subscriptions');
      expect(subs.rows).toEqual([{ id: aliceSub }]);
      const payments = await client.query<{ id: string }>('select id from public.payments');
      expect(payments.rows).toEqual([{ id: alicePayment }]);
      expect(await count(client, 'select 1 from public.subscription_events')).toBe(1);
      expect(await count(client, 'select 1 from public.payment_events')).toBe(1);

      await expectDenied(
        () =>
          client.query(`update public.subscriptions set status = 'cancelled' where id = $1`, [
            aliceSub,
          ]),
        client,
      );
      await expectDenied(
        () =>
          client.query(`update public.payments set status = 'paid' where id = $1`, [alicePayment]),
        client,
      );
      await expectDenied(
        () =>
          client.query(
            `insert into public.payments (user_id, provider, amount_uzs, idempotency_key) values ($1, 'mock', 1, $2)`,
            [alice.id, randomUUID()],
          ),
        client,
      );
    });
  });

  test('payment_methods: provider_token is not selectable by the app', async () => {
    await runInTransaction(async (client) => {
      const alice = await createMember(client);
      await client.query(
        `insert into public.payment_methods (user_id, provider, provider_token, masked_pan, expiry)
         values ($1, 'payme', 'tok_secret', '8600****1234', '12/29')`,
        [alice.id],
      );
      await asUser(client, { sub: alice.id });
      const visible = await client.query<{ masked_pan: string }>(
        'select masked_pan from public.payment_methods',
      );
      expect(visible.rows).toEqual([{ masked_pan: '8600****1234' }]);
      await expectDenied(
        () => client.query('select provider_token from public.payment_methods'),
        client,
      );
      await expectDenied(() => client.query('select * from public.payment_methods'), client);
    });
  });
});

describe('venue staff access', () => {
  test('staff read bookings of their venue, not of another venue; members read their own', async () => {
    await runInTransaction(async (client) => {
      const member = await createMember(client);
      const staff = await createMember(client);
      const venueA = await createVenue(client);
      const venueB = await createVenue(client);
      await addVenueStaff(client, venueA, staff.id);
      const sub = await createSubscription(client, member.id);
      const bookingA = await createBooking(client, member.id, venueA, sub);
      const bookingB = await createBooking(client, member.id, venueB, sub);

      await asUser(client, { sub: staff.id, roles: ['member', 'partner'] });
      const seen = await client.query<{ id: string }>('select id from public.bookings order by id');
      expect(seen.rows).toEqual([{ id: bookingA }]);
      await expectDenied(client.query('select * from public.bookings where id = $1', [bookingB]));
      expect(await count(client, 'select 1 from public.booking_events')).toBe(1);

      await asUser(client, { sub: member.id });
      expect(await count(client, 'select 1 from public.bookings')).toBe(2);
      await expectDenied(
        () =>
          client.query(`update public.bookings set status = 'cancelled' where id = $1`, [bookingA]),
        client,
      );
    });
  });

  test('owner manages staff of their venue only; staff see their own row', async () => {
    await runInTransaction(async (client) => {
      const owner = await createMember(client);
      const newcomer = await createMember(client);
      const venueA = await createVenue(client);
      const venueB = await createVenue(client);
      await addVenueStaff(client, venueA, owner.id, 'owner');

      await asUser(client, { sub: owner.id, roles: ['member', 'partner'] });
      const inserted = await client.query(
        `insert into public.venue_staff (venue_id, user_id) values ($1, $2) returning role`,
        [venueA, newcomer.id],
      );
      expect(inserted.rows[0]).toEqual({ role: 'staff' });
      await expectDenied(
        () =>
          client.query(`insert into public.venue_staff (venue_id, user_id) values ($1, $2)`, [
            venueB,
            newcomer.id,
          ]),
        client,
      );

      await asUser(client, { sub: newcomer.id, roles: ['member', 'partner'] });
      expect(await count(client, 'select 1 from public.venue_staff')).toBe(1);
    });
  });

  test('staff see and edit catalog rows of their venue regardless of status', async () => {
    await runInTransaction(async (client) => {
      const staff = await createMember(client);
      const draft = await createVenue(client, { status: 'draft' });
      await addVenueStaff(client, draft, staff.id);
      await client.query(
        `insert into public.venue_hours (venue_id, weekday, opens, closes) values ($1, 1, '08:00', '22:00')`,
        [draft],
      );

      await asUser(client, { sub: staff.id, roles: ['member', 'partner'] });
      expect(await count(client, 'select 1 from public.venues where id = $1', [draft])).toBe(1);
      expect(
        await count(client, 'select 1 from public.venue_hours where venue_id = $1', [draft]),
      ).toBe(1);
      const photo = await client.query(
        `insert into public.venue_photos (venue_id, path) values ($1, 'venues/x.jpg') returning sort`,
        [draft],
      );
      expect(photo.rows[0]).toEqual({ sort: 0 });
      // Staff (not owner) cannot change the venue record itself.
      await expectDenied(
        client.query(`update public.venues set district = 'Yunusabad' where id = $1`, [draft]),
      );
    });
  });
});

describe('public catalog and admin reads', () => {
  test('anon reads active venues but not draft/paused ones', async () => {
    await runInTransaction(async (client) => {
      const active = await createVenue(client, { status: 'active' });
      await createVenue(client, { status: 'draft' });
      await createVenue(client, { status: 'paused' });
      await asAnon(client);
      expect(await count(client, 'select 1 from public.venues where id = $1', [active])).toBe(1);
      expect(await count(client, `select 1 from public.venues where status <> 'active'`)).toBe(0);
    });
  });

  test('admin reads audit_log, members and anon do not', async () => {
    await runInTransaction(async (client) => {
      const admin = await createMember(client);
      const member = await createMember(client);
      await grantRole(client, admin.id, 'admin');
      await createVenue(client); // writes an audit row

      await asUser(client, { sub: admin.id, roles: ['member', 'admin'] });
      expect(
        await count(client, `select 1 from public.audit_log where entity = 'venues'`),
      ).toBeGreaterThan(0);
      await asUser(client, { sub: member.id });
      await expectDenied(client.query('select * from public.audit_log'));
      await asAnon(client);
      await expectDenied(() => client.query('select * from public.audit_log'), client);
    });
  });

  test('audit rows carry the actor from the JWT', async () => {
    await runInTransaction(async (client) => {
      const admin = await createMember(client);
      await grantRole(client, admin.id, 'admin');
      await asUser(client, { sub: admin.id, roles: ['member', 'admin'] });
      await client.query(
        `insert into public.feature_flags (key, enabled) values ('test_flag', true)`,
      );
      const { rows } = await client.query(
        `select actor_id, actor_role, action, entity, entity_id from public.audit_log
         where entity = 'feature_flags' and entity_id = 'test_flag'`,
      );
      expect(rows).toEqual([
        {
          actor_id: admin.id,
          actor_role: 'member,admin',
          action: 'insert',
          entity: 'feature_flags',
          entity_id: 'test_flag',
        },
      ]);
    });
  });

  test('reviews: anon reads published only; owner edits text within 24h, not status', async () => {
    await runInTransaction(async (client) => {
      const author = await createMember(client);
      const venue = await createVenue(client);
      const fresh = await createReview(client, author.id, venue, 5);
      const hidden = await createReview(client, author.id, venue, 1, { status: 'hidden' });
      const old = await createReview(client, author.id, venue, 4, {
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      });

      await asAnon(client);
      const published = await client.query<{ id: string }>(
        'select id from public.reviews where venue_id = $1 order by created_at',
        [venue],
      );
      expect(published.rows.map((row) => row.id).sort()).toEqual([fresh, old].sort());

      await asUser(client, { sub: author.id });
      expect(await count(client, 'select 1 from public.reviews where id = $1', [hidden])).toBe(1);
      const edited = await client.query(
        `update public.reviews set text = 'edited' where id = $1 returning text`,
        [fresh],
      );
      expect(edited.rows[0]).toEqual({ text: 'edited' });
      await expectDenied(
        client.query(`update public.reviews set text = 'late' where id = $1`, [old]),
      );
      await expectDenied(
        () => client.query(`update public.reviews set status = 'hidden' where id = $1`, [fresh]),
        client,
      );
      await resetRole(client);
    });
  });
});
