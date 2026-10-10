import { randomUUID } from 'node:crypto';

import { expectErrorCode, runInTransaction } from '../_harness/db';
import {
  createBooking,
  createMember,
  createPlan,
  createSubscription,
  createVenue,
} from './fixtures';

describe('subscriptions', () => {
  test('one non-terminal subscription per user (partial unique index)', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const plan = await createPlan(client);
      await createSubscription(client, user.id, { planId: plan, status: 'expired' });
      await createSubscription(client, user.id, { planId: plan, status: 'cancelled' });
      const active = await createSubscription(client, user.id, { planId: plan, status: 'active' });
      await expectErrorCode(
        () => createSubscription(client, user.id, { planId: plan, status: 'pending_payment' }),
        '23505',
        client,
      );
      await expectErrorCode(
        () => createSubscription(client, user.id, { planId: plan, status: 'frozen' }),
        '23505',
        client,
      );
      await client.query(`update public.subscriptions set status = 'expired' where id = $1`, [
        active,
      ]);
      await createSubscription(client, user.id, { planId: plan, status: 'active' });
    });
  });

  test('subscription_events ledger records creation and status changes', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const id = await createSubscription(client, user.id, { status: 'pending_payment' });
      await client.query(`update public.subscriptions set status = 'active' where id = $1`, [id]);
      await client.query(`update public.subscriptions set visits_used = 1 where id = $1`, [id]);
      const { rows } = await client.query<{ type: string; payload: Record<string, unknown> }>(
        `select type, payload from public.subscription_events where subscription_id = $1 order by seq`,
        [id],
      );
      expect(rows).toEqual([
        { type: 'created', payload: { status: 'pending_payment', plan_id: expect.any(String) } },
        { type: 'status_changed', payload: { from: 'pending_payment', to: 'active' } },
      ]);
    });
  });

  test('freezes are at most 30 days and well-ordered', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const id = await createSubscription(client, user.id);
      await expectErrorCode(
        () =>
          client.query(
            `insert into public.subscription_freezes (subscription_id, starts_at, ends_at)
             values ($1, now(), now() + interval '31 days')`,
            [id],
          ),
        '23514',
        client,
      );
      await client.query(
        `insert into public.subscription_freezes (subscription_id, starts_at, ends_at)
         values ($1, now(), now() + interval '30 days')`,
        [id],
      );
    });
  });
});

describe('bookings', () => {
  test('booking_events ledger records creation and status changes', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const venue = await createVenue(client);
      const sub = await createSubscription(client, user.id);
      const booking = await createBooking(client, user.id, venue, sub);
      await client.query(
        `update public.bookings set status = 'cancelled', cancel_reason = 'sick', cancelled_at = now() where id = $1`,
        [booking],
      );
      const { rows } = await client.query(
        `select type, from_status, to_status, payload ->> 'cancel_reason' as reason
         from public.booking_events where booking_id = $1 order by seq`,
        [booking],
      );
      expect(rows).toEqual([
        { type: 'created', from_status: null, to_status: 'confirmed', reason: null },
        {
          type: 'status_changed',
          from_status: 'confirmed',
          to_status: 'cancelled',
          reason: 'sick',
        },
      ]);
    });
  });

  test('one live booking per user and class session; cancelled ones do not count', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const venue = await createVenue(client);
      const sub = await createSubscription(client, user.id);
      const template = await client.query<{ id: string }>(
        `insert into public.class_templates (venue_id, name, duration_min, capacity)
         values ($1, '{"ru":"Йога"}', 60, 10) returning id`,
        [venue],
      );
      const session = await client.query<{ id: string }>(
        `insert into public.class_sessions (template_id, venue_id, starts_at, ends_at, capacity)
         values ($1, $2, now() + interval '1 day', now() + interval '1 day 1 hour', 10) returning id`,
        [template.rows[0]!.id, venue],
      );
      const insert = (status: string) =>
        client.query(
          `insert into public.bookings (user_id, venue_id, subscription_id, class_session_id, starts_at, ends_at, status, waitlist_position, idempotency_key)
           values ($1, $2, $3, $4, now() + interval '1 day', now() + interval '1 day 1 hour', $5::public.booking_status, case when $5::text = 'waitlisted' then 1 end, $6)`,
          [user.id, venue, sub, session.rows[0]!.id, status, randomUUID()],
        );
      await insert('cancelled');
      await insert('confirmed');
      await expectErrorCode(() => insert('waitlisted'), '23505', client);
    });
  });

  test('class_sessions and bookings reject ends_at <= starts_at', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const venue = await createVenue(client);
      const sub = await createSubscription(client, user.id);
      await expectErrorCode(
        () =>
          client.query(
            `insert into public.bookings (user_id, venue_id, subscription_id, starts_at, ends_at, idempotency_key)
             values ($1, $2, $3, now(), now(), $4)`,
            [user.id, venue, sub, randomUUID()],
          ),
        '23514',
        client,
      );
    });
  });
});
