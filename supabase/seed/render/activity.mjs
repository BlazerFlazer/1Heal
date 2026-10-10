/**
 * SQL for subscriptions, payments, bookings, visits and everything derived from them.
 *
 * Rows that end in a later state are inserted in their initial state and then moved with an
 * update, so the ledger triggers (subscription_events, payment_events, booking_events) record a
 * real transition. Ledger timestamps are then set to the simulated times (the triggers stamp
 * now()). Updates are guarded by the initial state, so re-running the seed changes nothing.
 */
import { columns, insertRows, valuesList } from '../lib/sql.mjs';

const T = (name) => `public.${name}`;
const sameAsCreated = { updated_at: (r) => r.createdAt };

/** `update <table> set status = ... from (values ...) where status = <from>`. */
function moveStatus({ table, enumType, from }, rows, extraSpec = '') {
  if (rows.length === 0) return `-- ${table}: no status changes\n`;
  const cols = columns(`id:uuid, status:str${extraSpec ? `, ${extraSpec}` : ''}`);
  const sets = cols
    .slice(1)
    .map(([name]) =>
      name === 'status' ? `status = v.status::public.${enumType}` : `${name} = v.${name}`,
    );
  return `update ${T(table)} t set ${sets.join(', ')}
from (values\n${valuesList(cols, rows)}\n) as v(${cols.map(([name]) => name).join(', ')})
where t.id = v.id and t.status = '${from}';\n`;
}

function renderSubscriptions({ subscriptions, freezes }) {
  const cols = columns(
    'id:uuid, user_id:uuid, plan_id:uuid, status:str, period_start:ts, period_end:ts, auto_renew:bool, ' +
      'visits_used:num, cancel_at:ts, frozen_until:ts, scheduled_plan_id:uuid, created_at:ts, updated_at:ts',
    { status: (s) => s.initialStatus, ...sameAsCreated },
  );
  // Expired periods first: a member's old period must be closed before the current one opens
  // (subscriptions_one_active_per_user_idx).
  const closed = subscriptions.filter((s) => s.status === 'expired');
  const open = subscriptions.filter((s) => s.status !== 'expired');
  const move = { table: 'subscriptions', enumType: 'subscription_status', from: 'active' };
  const events = subscriptions.flatMap((s) => [
    { subscriptionId: s.id, type: 'created', toStatus: null, at: s.createdAt },
    ...(s.status === s.initialStatus
      ? []
      : [{ subscriptionId: s.id, type: 'status_changed', toStatus: s.status, at: s.changedAt }]),
  ]);
  const eventCols = columns('subscription_id:uuid, type:str, to_status:str, at:ts');
  return [
    insertRows(T('subscriptions'), cols, closed),
    moveStatus(move, closed),
    insertRows(T('subscriptions'), cols, open),
    moveStatus(
      move,
      open.filter((s) => s.status !== s.initialStatus),
    ),
    insertRows(
      T('subscription_freezes'),
      columns(
        'id:uuid, subscription_id:uuid, starts_at:ts, ends_at:ts, created_by:uuid, created_at:ts',
      ),
      freezes,
    ),
    `update ${T('subscription_events')} e set created_at = v.at
from (values\n${valuesList(eventCols, events)}\n) as v(subscription_id, type, to_status, at)
where e.subscription_id = v.subscription_id and e.type = v.type
  and (v.to_status is null or e.payload ->> 'to' = v.to_status) and e.created_at is distinct from v.at;\n`,
  ].join('\n');
}

function renderPayments(payments) {
  return [
    insertRows(
      T('payments'),
      columns(
        'id:uuid, user_id:uuid, subscription_id:uuid, provider:str, provider_txn_id:str, amount_uzs:num, ' +
          'status:str, idempotency_key:str, metadata:json, created_at:ts, updated_at:ts',
        { status: () => 'pending', ...sameAsCreated },
      ),
      payments,
    ),
    moveStatus(
      { table: 'payments', enumType: 'payment_status', from: 'pending' },
      payments.filter((p) => p.status !== 'pending'),
      'paid_at:ts',
    ),
    `update ${T('payment_events')} e set created_at = x.at
from (select e2.id, case when e2.from_status is null then p.created_at
                          when e2.to_status = 'paid' then p.paid_at
                          else p.created_at + interval '2 minutes' end as at
      from ${T('payment_events')} e2 join ${T('payments')} p on p.id = e2.payment_id
      where p.idempotency_key like 'seed:%') x
where e.id = x.id and e.created_at is distinct from x.at;\n`,
  ].join('\n');
}

function renderBookings({ bookings, visits, qrTokens, attempts }) {
  return [
    insertRows(
      T('qr_tokens'),
      columns(
        'jti:uuid, user_id:uuid, device_id:uuid, issued_at:ts, expires_at:ts, used_at:ts, used_venue_id:uuid',
      ),
      qrTokens,
    ),
    insertRows(
      T('bookings'),
      columns(
        'id:uuid, user_id:uuid, venue_id:uuid, subscription_id:uuid, class_session_id:uuid, starts_at:ts, ' +
          'ends_at:ts, status:str, waitlist_position:num, idempotency_key:str, created_at:ts, updated_at:ts',
        { status: (b) => b.initialStatus, ...sameAsCreated },
      ),
      bookings,
    ),
    moveStatus(
      { table: 'bookings', enumType: 'booking_status', from: 'confirmed' },
      bookings.filter((b) => b.status !== b.initialStatus),
      'cancelled_at:ts, cancel_reason:str',
    ),
    insertRows(
      T('visits'),
      columns(
        'id:uuid, user_id:uuid, venue_id:uuid, booking_id:uuid, subscription_id:uuid, checked_in_at:ts, ' +
          'method:str, staff_user_id:uuid, manual_reason:str, qr_jti:uuid, created_at:ts',
        { created_at: (v) => v.checkedInAt },
      ),
      visits,
    ),
    insertRows(
      T('checkin_attempts'),
      columns(
        'id:uuid, venue_id:uuid, staff_user_id:uuid, user_id:uuid, jti:uuid, result_code:str, booking_id:uuid, created_at:ts',
      ),
      attempts,
    ),
    `update ${T('booking_events')} e set created_at = x.at
from (select e2.id, case when e2.type = 'created' then b.created_at
                          else coalesce(v.checked_in_at, b.cancelled_at, b.ends_at + interval '15 minutes') end as at
      from ${T('booking_events')} e2 join ${T('bookings')} b on b.id = e2.booking_id
      left join ${T('visits')} v on v.booking_id = b.id
      where b.idempotency_key like 'seed:%') x
where e.id = x.id and e.created_at is distinct from x.at;\n`,
  ].join('\n');
}

function renderDerived(m) {
  return [
    insertRows(
      T('penalties'),
      columns(
        'id:uuid, user_id:uuid, kind:str, starts_at:ts, ends_at:ts, source_booking_ids:uuidArray, created_at:ts',
      ),
      m.penalties,
    ),
    insertRows(
      T('reviews'),
      columns(
        'id:uuid, user_id:uuid, venue_id:uuid, visit_id:uuid, rating:num, text:str, status:str, created_at:ts, updated_at:ts',
        { status: () => 'published', ...sameAsCreated },
      ),
      m.reviews,
    ),
    insertRows(T('favorites'), columns('user_id:uuid, venue_id:uuid, created_at:ts'), m.favorites),
    insertRows(
      T('notifications'),
      columns(
        'id:uuid, user_id:uuid, kind:str, title:json, body:json, data:json, sent_at:ts, read_at:ts, created_at:ts',
      ),
      m.notifications,
    ),
    insertRows(
      T('payouts'),
      columns(
        'id:uuid, venue_id:uuid, period_start:str, period_end:str, visits_count:num, amount_uzs:num, status:str, paid_at:ts',
      ),
      m.payouts,
    ),
    insertRows(
      T('account_deletion_requests'),
      columns('id:uuid, user_id:uuid, requested_at:ts, export_requested:bool, created_at:ts', {
        created_at: (r) => r.requestedAt,
      }),
      m.deletionRequests,
    ),
  ].join('\n');
}

export function renderActivity(model) {
  return [
    renderSubscriptions(model),
    renderPayments(model.payments),
    renderBookings(model),
    renderDerived(model),
  ].join('\n');
}
