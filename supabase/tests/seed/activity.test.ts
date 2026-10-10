/**
 * Seed activity: subscriptions, visits and bookings respect the plan rules the server will
 * enforce (docs/PLAN.md section 3 "Derived rules"), ratings match reviews and the ledgers carry
 * the simulated history.
 */
import { ANCHOR, PHONES, one, rows } from './helpers';

describe('seed: subscriptions', () => {
  test('at most one non-terminal subscription per user; 20 active on each plan', async () => {
    const duplicated = await rows(
      `select user_id from public.subscriptions where status not in ('cancelled', 'expired')
       group by user_id having count(*) > 1`,
    );
    expect(duplicated).toEqual([]);
    const active = await rows(
      `select p.code, count(*)::int as n from public.subscriptions s join public.plans p on p.id = s.plan_id
       where s.status = 'active' group by p.code, p.sort order by p.sort`,
    );
    expect(active).toEqual([
      { code: 'basic', n: 20 },
      { code: 'standard', n: 20 },
      { code: 'premium', n: 20 },
    ]);
  });

  test('every subscription has a payment; paid periods carry their plan price', async () => {
    const unpaid = await rows(
      `select s.id, s.status from public.subscriptions s
       where not exists (select 1 from public.payments p where p.subscription_id = s.id
                         and p.status = case when s.status = 'pending_payment' then 'pending'::public.payment_status
                                             else 'paid'::public.payment_status end
                         and p.amount_uzs = (select price_uzs from public.plans where id = s.plan_id))`,
    );
    expect(unpaid).toEqual([]);
  });
});

describe('seed: visits respect the plan rules', () => {
  test('monthly quota: visits + no-shows = visits_used, and with upcoming bookings within the plan limit', async () => {
    const overQuota = await rows(
      `select s.id, p.code, p.visits_per_month, s.visits_used, x.visits, x.no_shows, x.upcoming
       from public.subscriptions s
       join public.plans p on p.id = s.plan_id
       cross join lateral (
         select (select count(*)::int from public.visits v where v.subscription_id = s.id) as visits,
                (select count(*)::int from public.bookings b
                  where b.subscription_id = s.id and b.status = 'no_show') as no_shows,
                (select count(*)::int from public.bookings b
                  where b.subscription_id = s.id and b.status = 'confirmed') as upcoming
       ) x
       where s.visits_used <> x.visits + x.no_shows
          or x.visits > p.visits_per_month
          or s.visits_used + x.upcoming > p.visits_per_month`,
    );
    expect(overQuota).toEqual([]);
  });

  test('per-venue monthly cap and venue tier', async () => {
    const overCap = await rows(
      `select s.id, v.venue_id, count(*)::int as n, p.per_venue_monthly_cap
       from public.visits v join public.subscriptions s on s.id = v.subscription_id
       join public.plans p on p.id = s.plan_id
       group by s.id, v.venue_id, p.per_venue_monthly_cap
       having count(*) > p.per_venue_monthly_cap`,
    );
    expect(overCap).toEqual([]);
    const wrongTier = await rows(
      `select b.id from public.bookings b
       join public.venues ve on ve.id = b.venue_id
       join public.subscriptions s on s.id = b.subscription_id
       join public.plans p on p.id = s.plan_id
       where ve.tier > p.max_venue_tier or ve.status <> 'active'`,
    );
    expect(wrongTier).toEqual([]);
  });

  test('visits and bookings fall inside their subscription period, frozen days and the anchor', async () => {
    const outside = await rows(
      `select v.id from public.visits v join public.subscriptions s on s.id = v.subscription_id
       where v.checked_in_at < s.period_start or v.checked_in_at >= s.period_end
          or v.checked_in_at >= $1::timestamptz
          or exists (select 1 from public.subscription_freezes f
                     where f.subscription_id = s.id and v.checked_in_at >= f.starts_at)
       union all
       select b.id from public.bookings b join public.subscriptions s on s.id = b.subscription_id
       where b.starts_at < s.period_start or b.starts_at >= s.period_end or b.created_at >= b.starts_at
          or (b.status in ('confirmed', 'waitlisted')) <> (b.starts_at >= $1::timestamptz)`,
      [ANCHOR],
    );
    expect(outside).toEqual([]);
  });

  test('history spans the 60 days before the anchor with check-ins, no-shows and cancellations', async () => {
    const statuses = await rows<{ status: string; n: number; first: Date }>(
      `select status::text, count(*)::int as n, min(starts_at) as first from public.bookings group by status order by status`,
    );
    const byStatus = Object.fromEntries(statuses.map((s) => [s.status, s]));
    expect(byStatus.checked_in!.n).toBeGreaterThan(500);
    expect(byStatus.no_show!.n).toBeGreaterThan(5);
    expect(byStatus.cancelled!.n).toBeGreaterThan(5);
    expect(byStatus.confirmed!.n).toBeGreaterThan(10);
    expect(byStatus.waitlisted!.n).toBe(2);
    const anchor = new Date(ANCHOR).getTime();
    expect(byStatus.checked_in!.first.getTime()).toBeGreaterThanOrEqual(anchor - 60 * 86_400_000);
    const qr = await one<{ unmatched: number }>(
      `select count(*)::int as unmatched from public.visits v
       where (v.method = 'qr') <> exists (select 1 from public.qr_tokens t
                                          where t.jti = v.qr_jti and t.used_venue_id = v.venue_id and t.used_at = v.checked_in_at)`,
    );
    expect(qr.unmatched).toBe(0);
  });
});

describe('seed: reviews and ledgers', () => {
  test('15 published reviews on the reviewers own visits; rating_avg/rating_count match', async () => {
    const reviews = await one<{ n: number; foreign: number }>(
      `select count(*)::int as n,
              count(*) filter (where v.user_id <> r.user_id or v.venue_id <> r.venue_id
                               or r.created_at <= v.checked_in_at)::int as foreign
       from public.reviews r join public.visits v on v.id = r.visit_id where r.status = 'published'`,
    );
    expect(reviews).toEqual({ n: 15, foreign: 0 });
    const mismatched = await rows(
      `select v.slug, v.rating_avg, v.rating_count from public.venues v
       left join public.reviews r on r.venue_id = v.id and r.status = 'published'
       group by v.id
       having v.rating_avg <> coalesce(round(avg(r.rating)::numeric, 2), 0) or v.rating_count <> count(r.id)`,
    );
    expect(mismatched).toEqual([]);
  });

  test('ledgers record each transition at its simulated time, all before the anchor', async () => {
    const missing = await rows(
      `select b.id from public.bookings b
       where not exists (select 1 from public.booking_events e where e.booking_id = b.id and e.type = 'created'
                         and e.created_at = b.created_at)
          or (b.status in ('checked_in', 'no_show', 'cancelled') and not exists (
                select 1 from public.booking_events e where e.booking_id = b.id and e.type = 'status_changed'
                and e.from_status = 'confirmed' and e.to_status = b.status))`,
    );
    expect(missing).toEqual([]);
    const latest = await one<{ bookings: Date; payments: Date; subscriptions: Date }>(
      `select (select max(created_at) from public.booking_events) as bookings,
              (select max(created_at) from public.payment_events) as payments,
              (select max(created_at) from public.subscription_events) as subscriptions`,
    );
    const anchor = new Date(ANCHOR).getTime();
    for (const at of Object.values(latest)) expect(at.getTime()).toBeLessThan(anchor);
  });

  test('the scripted no-show story yields the only penalty, active over the anchor', async () => {
    const penalties = await rows(
      `select p.phone_e164, cardinality(n.source_booking_ids) as sources,
              (select count(*)::int from public.bookings b
                where b.id = any (n.source_booking_ids) and b.status = 'no_show' and b.user_id = n.user_id) as no_shows,
              n.starts_at < $1::timestamptz and n.ends_at > $1::timestamptz as active
       from public.penalties n join public.profiles p on p.id = n.user_id`,
      [ANCHOR],
    );
    expect(penalties).toEqual([
      { phone_e164: PHONES.featured.penalised, sources: 3, no_shows: 3, active: true },
    ]);
  });
});
