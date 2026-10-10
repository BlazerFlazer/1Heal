import { expectErrorCode, runInTransaction } from '../_harness/db';
import { createMember, createPayment } from './fixtures';

describe('payment state machine', () => {
  test('created -> pending -> paid -> refunded writes one event per step and sets paid_at', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const id = await createPayment(client, user.id);
      for (const status of ['pending', 'paid', 'refunded']) {
        await client.query(`update public.payments set status = $2 where id = $1`, [id, status]);
      }
      const payment = await client.query<{ status: string; has_paid_at: boolean }>(
        `select status, paid_at is not null as has_paid_at from public.payments where id = $1`,
        [id],
      );
      expect(payment.rows[0]).toEqual({ status: 'refunded', has_paid_at: true });

      const events = await client.query<{
        from_status: string | null;
        to_status: string;
        source: string;
      }>(
        `select from_status, to_status, source from public.payment_events where payment_id = $1 order by seq`,
        [id],
      );
      expect(events.rows).toEqual([
        { from_status: null, to_status: 'created', source: 'system' },
        { from_status: 'created', to_status: 'pending', source: 'system' },
        { from_status: 'pending', to_status: 'paid', source: 'system' },
        { from_status: 'paid', to_status: 'refunded', source: 'system' },
      ]);
    });
  });

  test('disputed -> paid and disputed -> refunded are allowed', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const a = await createPayment(client, user.id, 'paid');
      const b = await createPayment(client, user.id, 'paid');
      await client.query(`update public.payments set status = 'disputed' where id in ($1, $2)`, [
        a,
        b,
      ]);
      await client.query(`update public.payments set status = 'paid' where id = $1`, [a]);
      await client.query(`update public.payments set status = 'refunded' where id = $1`, [b]);
      const { rows } = await client.query<{ id: string; status: string }>(
        `select id, status from public.payments where id in ($1, $2) order by status`,
        [a, b],
      );
      expect(rows).toEqual([
        { id: a, status: 'paid' },
        { id: b, status: 'refunded' },
      ]);
    });
  });

  test('invalid transitions raise P0001 and write no event', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const created = await createPayment(client, user.id);
      const paid = await createPayment(client, user.id, 'paid');
      const failed = await createPayment(client, user.id, 'failed');

      await expectErrorCode(
        () => client.query(`update public.payments set status = 'paid' where id = $1`, [created]),
        'P0001',
        client,
      );
      await expectErrorCode(
        () => client.query(`update public.payments set status = 'pending' where id = $1`, [paid]),
        'P0001',
        client,
      );
      await expectErrorCode(
        () => client.query(`update public.payments set status = 'paid' where id = $1`, [failed]),
        'P0001',
        client,
      );

      const { rows } = await client.query<{ n: number }>(
        `select count(*)::int as n from public.payment_events where payment_id in ($1, $2, $3)`,
        [created, paid, failed],
      );
      expect(rows[0]?.n).toBe(3); // only the three insert events
    });
  });

  test('source and raw payload come from transaction-local settings when set', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      const id = await createPayment(client, user.id, 'pending');
      await client.query(`select set_config('oneheal.payment_event_source', 'webhook', true)`);
      await client.query(
        `select set_config('oneheal.payment_event_raw', '{"provider":"payme","state":2}', true)`,
      );
      await client.query(`update public.payments set status = 'paid' where id = $1`, [id]);
      const { rows } = await client.query(
        `select source, raw from public.payment_events where payment_id = $1 and to_status = 'paid'`,
        [id],
      );
      expect(rows).toEqual([{ source: 'webhook', raw: { provider: 'payme', state: 2 } }]);
    });
  });

  test('idempotency_key and (provider, provider_txn_id) are unique', async () => {
    await runInTransaction(async (client) => {
      const user = await createMember(client);
      await client.query(
        `insert into public.payments (user_id, provider, provider_txn_id, amount_uzs, idempotency_key)
         values ($1, 'click', 'txn-1', 1000, 'key-1')`,
        [user.id],
      );
      await expectErrorCode(
        () =>
          client.query(
            `insert into public.payments (user_id, provider, amount_uzs, idempotency_key) values ($1, 'mock', 1, 'key-1')`,
            [user.id],
          ),
        '23505',
        client,
      );
      await expectErrorCode(
        () =>
          client.query(
            `insert into public.payments (user_id, provider, provider_txn_id, amount_uzs, idempotency_key)
             values ($1, 'click', 'txn-1', 1, 'key-2')`,
            [user.id],
          ),
        '23505',
        client,
      );
    });
  });
});
