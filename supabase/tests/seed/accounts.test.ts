/**
 * Seed accounts: demo members, partner staff and the admin (docs/SEED.md) and the stories of the
 * featured accounts.
 */
import { ANCHOR, PHONES, one, rows } from './helpers';

describe('seed: demo accounts', () => {
  test('100 demo members, 5 partner staff with phones ending in 00, one admin', async () => {
    const accounts = await rows<{ phone_e164: string; roles: string[] }>(
      `select p.phone_e164, array_agg(r.role::text order by r.role) as roles
       from public.profiles p join public.user_roles r on r.user_id = p.id group by p.phone_e164`,
    );
    const members = accounts.filter((a) => a.roles.join() === 'member');
    expect(members).toHaveLength(100);
    expect(
      members.every((a) => /^\+99890\d{7}$/.test(a.phone_e164) && !a.phone_e164.endsWith('00')),
    ).toBe(true);
    const partners = accounts
      .filter((a) => a.roles.includes('partner'))
      .map((a) => a.phone_e164)
      .sort();
    expect(partners).toEqual([...PHONES.staff]);
    expect(accounts.filter((a) => a.roles.includes('admin'))).toEqual([
      { phone_e164: PHONES.admin, roles: ['member', 'admin'] },
    ]);
  });

  test('partner staff run active venues; owners and staff as in docs/SEED.md', async () => {
    const links = await rows(
      `select p.phone_e164, v.slug, s.role::text, v.status::text as venue_status
       from public.venue_staff s join public.profiles p on p.id = s.user_id join public.venues v on v.id = s.venue_id
       where s.active order by p.phone_e164, v.slug`,
    );
    expect(links).toEqual([
      {
        phone_e164: '+998901234500',
        slug: 'pulse-fitness-chilanzar',
        role: 'owner',
        venue_status: 'active',
      },
      {
        phone_e164: '+998901234500',
        slug: 'pulse-fitness-yunusabad',
        role: 'owner',
        venue_status: 'active',
      },
      {
        phone_e164: '+998901234600',
        slug: 'pulse-fitness-yunusabad',
        role: 'staff',
        venue_status: 'active',
      },
      {
        phone_e164: '+998901234700',
        slug: 'lotus-yoga-shaykhantahur',
        role: 'owner',
        venue_status: 'active',
      },
      {
        phone_e164: '+998901234800',
        slug: 'zilol-aqua-mirzo-ulugbek',
        role: 'staff',
        venue_status: 'active',
      },
      {
        phone_e164: '+998901234900',
        slug: 'oasis-spa-mirabad',
        role: 'owner',
        venue_status: 'active',
      },
      {
        phone_e164: '+998901234900',
        slug: 'tiniq-massage-almazar',
        role: 'owner',
        venue_status: 'draft',
      },
    ]);
  });

  test('access tokens carry the seeded roles (custom_access_token_hook)', async () => {
    const claims = await rows<{ phone_e164: string; roles: string[] }>(
      `select p.phone_e164,
              public.custom_access_token_hook(jsonb_build_object('user_id', p.id, 'claims', '{}'::jsonb))
                -> 'claims' -> 'app_metadata' -> 'roles' as roles
       from public.profiles p where p.phone_e164 in ($1, $2, $3) order by p.phone_e164`,
      [PHONES.admin, PHONES.staff[0], PHONES.featured.standardActive],
    );
    expect(claims).toEqual([
      { phone_e164: PHONES.admin, roles: ['member', 'admin'] },
      { phone_e164: PHONES.featured.standardActive, roles: ['member'] },
      { phone_e164: PHONES.staff[0], roles: ['member', 'partner'] },
    ]);
  });

  test('profiles mirror the auth sign-up metadata and onboarding consents', async () => {
    const problems = await rows(
      `select p.id from public.profiles p join auth.users u on u.id = p.id
       where p.phone_e164 is distinct from '+' || u.phone
          or p.locale::text is distinct from u.raw_user_meta_data ->> 'locale'
          or p.full_name is distinct from u.raw_user_meta_data ->> 'full_name'
          or p.terms_accepted_at is null or p.privacy_accepted_at is null
          or (select count(*) from public.consents c
               where c.user_id = p.id and c.kind in ('terms', 'privacy') and c.granted) <> 2
          or (p.marketing_consent_at is not null) <> exists (
               select 1 from public.consents c where c.user_id = p.id and c.kind = 'marketing' and c.granted)`,
    );
    expect(problems).toEqual([]);
    const locales = await rows<{ locale: string }>(
      `select distinct locale::text from public.profiles order by 1`,
    );
    expect(locales.map((l) => l.locale)).toEqual(['en', 'ru', 'uz']);
  });
});

describe('seed: featured demo stories', () => {
  const subscriptionOf = (phone: string) =>
    one<{
      code: string;
      status: string;
      visits_used: number;
      scheduled: string | null;
      frozen_until: Date | null;
    }>(
      `select pl.code::text, s.status::text, s.visits_used, sp.code::text as scheduled, s.frozen_until
       from public.subscriptions s join public.profiles p on p.id = s.user_id
       join public.plans pl on pl.id = s.plan_id left join public.plans sp on sp.id = s.scheduled_plan_id
       where p.phone_e164 = $1 and s.status not in ('cancelled', 'expired')`,
      [phone],
    );

  test('subscription states of the featured members', async () => {
    const f = PHONES.featured;
    expect(await subscriptionOf(f.standardActive)).toMatchObject({
      code: 'standard',
      status: 'active',
    });
    expect(await subscriptionOf(f.basicNearQuota)).toMatchObject({
      code: 'basic',
      status: 'active',
      visits_used: 7,
    });
    expect(await subscriptionOf(f.premiumWaitlisted)).toMatchObject({
      code: 'premium',
      status: 'active',
    });
    const frozen = await subscriptionOf(f.frozen);
    expect(frozen).toMatchObject({ code: 'standard', status: 'frozen' });
    expect(frozen.frozen_until!.getTime()).toBeGreaterThan(new Date(ANCHOR).getTime());
    expect(await subscriptionOf(f.pendingPayment)).toMatchObject({
      code: 'premium',
      status: 'pending_payment',
    });
    expect(await subscriptionOf(f.scheduledDowngrade)).toMatchObject({
      code: 'premium',
      status: 'active',
      scheduled: 'standard',
    });
    const none = await one<{ n: number }>(
      `select count(*)::int as n from public.subscriptions s join public.profiles p on p.id = s.user_id
       where p.phone_e164 = $1`,
      [f.noSubscription],
    );
    expect(none.n).toBe(0);
  });

  test('near-quota member has used the per-venue cap at one venue', async () => {
    const atVenue = await rows(
      `select v.slug, count(*)::int as n from public.visits x join public.venues v on v.id = x.venue_id
       join public.subscriptions s on s.id = x.subscription_id and s.status = 'active'
       join public.profiles p on p.id = x.user_id where p.phone_e164 = $1 group by v.slug order by v.slug`,
      [PHONES.featured.basicNearQuota],
    );
    expect(atVenue).toEqual([
      { slug: 'chaqmoq-box-sergeli', n: 2 },
      { slug: 'kuch-gym-sergeli', n: 4 },
    ]);
  });

  test('a full reformer class with a waitlist, and a busy day for the partner demo venue', async () => {
    const waitlist = await rows(
      `select p.phone_e164, b.waitlist_position, s.booked_count = s.capacity as full
       from public.bookings b join public.class_sessions s on s.id = b.class_session_id
       join public.profiles p on p.id = b.user_id where b.status = 'waitlisted' order by b.waitlist_position`,
    );
    expect(waitlist).toHaveLength(2);
    expect(waitlist[0]).toEqual({
      phone_e164: PHONES.featured.premiumWaitlisted,
      waitlist_position: 1,
      full: true,
    });
    const today = await one<{ n: number; mine: number }>(
      `select count(*)::int as n,
              count(*) filter (where p.phone_e164 = $2)::int as mine
       from public.bookings b join public.venues v on v.id = b.venue_id join public.profiles p on p.id = b.user_id
       where v.slug = 'pulse-fitness-yunusabad' and b.status = 'confirmed'
         and b.starts_at >= $1::timestamptz and b.starts_at < $1::timestamptz + interval '1 day'`,
      [ANCHOR, PHONES.featured.standardActive],
    );
    expect(today.n).toBeGreaterThanOrEqual(6);
    expect(today.mine).toBe(1);
  });
});
