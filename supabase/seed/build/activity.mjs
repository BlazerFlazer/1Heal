/**
 * Runs the visit simulation in a fixed order:
 *   1. scripted history of the featured members (stories documented in docs/SEED.md),
 *   2. random history for every other subscription period inside the 60-day window,
 *   3. demo upcoming bookings (a full reformer class with a waitlist, a busy "today" at the venue
 *      the partner demo accounts run, the featured members' plans),
 *   4. random upcoming bookings for the next 7 days,
 * then derives visits_used, penalties and per-member venue preferences.
 */
import {
  ANCHOR,
  ANCHOR_DATE,
  DAY_MS,
  HISTORY_DAYS,
  HOUR_MS,
  weekdayOfOffset,
} from '../lib/time.mjs';
import { homeVenues } from './habits.mjs';
import { createBookingEngine } from './visits.mjs';

// prettier-ignore
const SCRIPTS = {
  f1: [
    { d: -5, venue: 'lotus-yoga-shaykhantahur', outcome: 'checked_in', time: null, classAt: '19:00' },
  ],
  f2: [
    { d: -20, venue: 'kuch-gym-sergeli', outcome: 'checked_in', time: '19:00' },
    { d: -17, venue: 'chaqmoq-box-sergeli', outcome: 'checked_in', time: '18:00' },
    { d: -15, venue: 'kuch-gym-sergeli', outcome: 'checked_in', time: '19:30' },
    { d: -12, venue: 'chaqmoq-box-sergeli', outcome: 'no_show', time: '18:00' },
    { d: -10, venue: 'kuch-gym-sergeli', outcome: 'checked_in', time: '07:30' },
    { d: -6, venue: 'chaqmoq-box-sergeli', outcome: 'checked_in', time: '18:30' },
    { d: -3, venue: 'kuch-gym-sergeli', outcome: 'checked_in', time: '19:00' },
  ],
  f3: [{ d: -4, venue: 'oasis-spa-mirabad', outcome: 'checked_in', time: '12:00' }],
  f6: [
    { d: -24, venue: 'delfin-pool-chilanzar', outcome: 'checked_in', time: '08:00' },
    { d: -20, venue: 'raqs-studio-chilanzar', outcome: 'no_show', time: '19:00' },
    { d: -16, venue: 'kedr-banya-chilanzar', outcome: 'checked_in', time: '18:00' },
    { d: -10, venue: 'raqs-studio-chilanzar', outcome: 'no_show', time: '19:00' },
    { d: -6, venue: 'delfin-pool-chilanzar', outcome: 'checked_in', time: '08:00' },
    { d: -3, venue: 'raqs-studio-chilanzar', outcome: 'no_show', time: '19:00' },
  ],
};

// prettier-ignore
const SCRIPTED_UPCOMING = [
  { key: 'f1', d: 0, venue: 'pulse-fitness-yunusabad', outcome: 'confirmed', time: '18:30' },
  { key: 'f1', d: 2, venue: 'lotus-yoga-shaykhantahur', outcome: 'confirmed', classAt: '19:00' },
  { key: 'f3', d: 3, venue: 'oasis-spa-mirabad', outcome: 'confirmed', time: '11:00' },
];

/** The demo class: Core Pilates reformer, Tuesday 19:00 (day +1), capacity 6, two waitlisted. */
const WAITLIST_DEMO = { venue: 'core-pilates-yakkasaray', d: 1, time: '19:00', waitlisted: ['f3'] };
/** Partner demo: Pulse Fitness Yunusabad (staff-1 owner, staff-2 staff) has >= 6 bookings today. */
const TODAY_DEMO = { venue: 'pulse-fitness-yunusabad', d: 0, minBookings: 6 };

export function simulateActivity(rng, { catalog, people, subscriptions, staffByVenue }) {
  // The scripted times above are chosen per weekday (opening hours, fixed class slots).
  if (weekdayOfOffset(0) !== 1) throw new Error(`ANCHOR_DATE ${ANCHOR_DATE} must be a Monday`);
  const engine = createBookingEngine(rng, { catalog, staffByVenue });
  const venueBySlug = new Map(catalog.venues.map((v) => [v.slug, v]));
  const planById = new Map(catalog.plans.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const personByKey = new Map(people.map((p) => [p.key, p]));
  const subsByUser = new Map();
  for (const sub of subscriptions)
    subsByUser.set(sub.userId, [...(subsByUser.get(sub.userId) ?? []), sub]);
  const currentSub = (person) => subscriptions.find((s) => s.id === person.currentSubscriptionId);
  const subAt = (person, ms) =>
    (subsByUser.get(person.id) ?? []).find(
      (s) => s.periodStart <= ms && ms < s.periodEnd && s.status !== 'pending_payment',
    );

  const scripted = (r, person, step) => {
    const venue = venueBySlug.get(step.venue);
    const at = ANCHOR + step.d * DAY_MS;
    const sub = step.d < 0 ? subAt(person, at + 12 * HOUR_MS) : currentSub(person);
    const session = step.classAt ? engine.sessionAt(venue, step.d, step.classAt) : undefined;
    if (step.classAt && !session)
      throw new Error(`no ${step.classAt} session at ${step.venue} day ${step.d}`);
    return engine.book(r, {
      person,
      sub,
      venue,
      d: step.d,
      outcome: step.outcome,
      time: step.time ?? undefined,
      session,
      forced: true,
    });
  };

  // 1. Scripted history.
  for (const [key, steps] of Object.entries(SCRIPTS)) {
    const r = rng.fork(`script:${key}`);
    for (const step of steps) scripted(r, personByKey.get(key), step);
  }

  // 2. Random history, chronologically per subscription period.
  for (const sub of [...subscriptions].sort((a, b) => a.periodStart - b.periodStart)) {
    const person = personById.get(sub.userId);
    if (sub.status === 'pending_payment' || (person.scriptedOnly && sub.role === 'current'))
      continue;
    const r = rng.fork(`history:${sub.id}`);
    const venues = homeVenues(person, planById.get(sub.planId).maxVenueTier);
    const firstDay = Math.max(-HISTORY_DAYS, Math.floor((sub.periodStart - ANCHOR) / DAY_MS));
    const lastDay = Math.min(-1, Math.floor((sub.periodEnd - ANCHOR) / DAY_MS));
    for (let d = firstDay; d <= lastDay; d += 1) {
      if (!r.chance(person.habits.perWeek / 7)) continue;
      const roll = r.next();
      let outcome =
        roll < 0.05
          ? 'cancelled'
          : roll < 0.085
            ? 'no_show'
            : roll < 0.19
              ? 'walk_in'
              : 'checked_in';
      // Generated members never reach the penalty rule; only the scripted story does.
      if (outcome === 'no_show' && engine.recentNoShows(person, ANCHOR + d * DAY_MS).length >= 2)
        outcome = 'checked_in';
      for (const venue of r.shuffle(venues).slice(0, 3)) {
        if (engine.book(r, { person, sub, venue, d, outcome })) break;
      }
    }
  }

  // 3. Demo upcoming bookings.
  const ur = rng.fork('upcoming-demo');
  for (const step of SCRIPTED_UPCOMING) scripted(ur, personByKey.get(step.key), step);

  const isBookable = (p) =>
    p.kind === 'member' &&
    !p.featured &&
    p.scenario === 'active' &&
    currentSub(p)?.status === 'active';
  const premium = ur.shuffle(
    people.filter((p) => isBookable(p) && currentSub(p).planCode === 'premium'),
  );
  const waitVenue = venueBySlug.get(WAITLIST_DEMO.venue);
  const waitSession = engine.sessionAt(waitVenue, WAITLIST_DEMO.d, WAITLIST_DEMO.time);
  for (const person of premium) {
    if (waitSession.bookedCount >= waitSession.capacity) break;
    engine.book(ur, {
      person,
      sub: currentSub(person),
      venue: waitVenue,
      d: WAITLIST_DEMO.d,
      outcome: 'confirmed',
      session: waitSession,
    });
  }
  for (const key of WAITLIST_DEMO.waitlisted) {
    const person = personByKey.get(key);
    engine.book(ur, {
      person,
      sub: currentSub(person),
      venue: waitVenue,
      d: WAITLIST_DEMO.d,
      outcome: 'waitlisted',
      session: waitSession,
      forced: true,
    });
  }
  for (const person of premium) {
    if (
      engine.book(ur, {
        person,
        sub: currentSub(person),
        venue: waitVenue,
        d: WAITLIST_DEMO.d,
        outcome: 'waitlisted',
        session: waitSession,
      })
    )
      break;
  }

  const todayVenue = venueBySlug.get(TODAY_DEMO.venue);
  const todayCount = () =>
    engine.out.bookings.filter(
      (b) =>
        b.venueId === todayVenue.id && b.status === 'confirmed' && b.startsAt < ANCHOR + DAY_MS,
    ).length;
  for (const person of ur.shuffle(
    people.filter((p) => isBookable(p) && currentSub(p).planCode !== 'basic'),
  )) {
    if (todayCount() >= TODAY_DEMO.minBookings) break;
    engine.book(ur, {
      person,
      sub: currentSub(person),
      venue: todayVenue,
      d: TODAY_DEMO.d,
      outcome: 'confirmed',
    });
  }

  // 4. Random upcoming bookings in the next 7 days.
  for (const person of people.filter(isBookable)) {
    const r = rng.fork(`upcoming:${person.key}`);
    if (!r.chance(0.55)) continue;
    const sub = currentSub(person);
    const venues = homeVenues(person, planById.get(sub.planId).maxVenueTier);
    for (let k = r.int(1, 2); k > 0; k -= 1) {
      engine.book(r, { person, sub, venue: r.pick(venues), d: r.int(0, 6), outcome: 'confirmed' });
    }
  }

  for (const sub of subscriptions) sub.visitsUsed = engine.counter(sub).consumed;
  return { ...engine.out, penalties: engine.penalties() };
}
