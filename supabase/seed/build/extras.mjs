/**
 * Everything derived from the simulated activity: 15 published reviews (one per visit, written
 * in the reviewer's language), favorites, in-app notifications, monthly payouts, notification
 * preferences and one open account-deletion request.
 */
import { REVIEW_TEXTS } from '../data/texts.mjs';
import { PAYOUT_RATE_UZS } from '../data/platform.mjs';
import { seedUuid } from '../lib/ids.mjs';
import { ANCHOR, HOUR_MS, MINUTE_MS, localMonth, localMs } from '../lib/time.mjs';
import { homeVenues } from './habits.mjs';
import { buildNotifications } from './notifications.mjs';

const FEATURED_REVIEWS = [
  ['f1', 'lotus-yoga-shaykhantahur', 5],
  ['f3', 'oasis-spa-mirabad', 5],
];
/** 13 more reviews spread over the busiest venues, so most reviewed venues have 2-3 reviews. */
const OTHER_REVIEWS = 13;
const REVIEWED_VENUES = 6;
const LOW_RATINGS = [2, 3];
const OTHER_RATINGS = [5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4];

function buildReviews(r, { people, venues, visits }) {
  const personById = new Map(people.map((p) => [p.id, p]));
  const venueBySlug = new Map(venues.map((v) => [v.slug, v]));
  const unused = structuredClone(REVIEW_TEXTS);
  const takeText = (locale, rating) => {
    for (const candidate of [rating, rating - 1, rating + 1, rating - 2, rating + 2]) {
      const pool = unused[locale][candidate];
      if (pool?.length) return { rating: candidate, text: pool.shift() };
    }
    throw new Error(`no review text left for ${locale}`);
  };
  const chosen = FEATURED_REVIEWS.map(([key, slug, rating]) => {
    const person = people.find((p) => p.key === key);
    const visit = visits.find(
      (v) => v.userId === person.id && v.venueId === venueBySlug.get(slug).id,
    );
    return { visit, person, rating };
  });
  const seen = new Set(chosen.map(({ visit }) => `${visit.userId}:${visit.venueId}`));

  // The busiest venues (by generated visits) collect the other reviews, round-robin.
  const byVenue = new Map();
  for (const visit of visits.filter((v) => !personById.get(v.userId).featured)) {
    byVenue.set(visit.venueId, [...(byVenue.get(visit.venueId) ?? []), visit]);
  }
  const busiest = [...byVenue.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, REVIEWED_VENUES)
    .map(([, list]) => r.shuffle(list));
  const others = [];
  for (let round = 0; others.length < OTHER_REVIEWS && round < 50; round += 1) {
    for (const list of busiest) {
      const visit = list.find((v) => !seen.has(`${v.userId}:${v.venueId}`));
      if (!visit || others.length >= OTHER_REVIEWS) continue;
      seen.add(`${visit.userId}:${visit.venueId}`);
      others.push({ visit, person: personById.get(visit.userId) });
    }
  }
  // Low ratings land on the venues with the most reviews, so no venue shows a lone 2-star.
  const ratings = [...LOW_RATINGS, ...r.shuffle(OTHER_RATINGS)];
  others.forEach((entry, index) => {
    entry.rating = ratings[index];
  });
  chosen.push(...others);
  return chosen.map(({ visit, person, rating }) => {
    const picked = takeText(person.locale, rating);
    const createdAt = Math.min(
      visit.checkedInAt + r.int(60, 20 * 60) * MINUTE_MS,
      ANCHOR - 30 * MINUTE_MS,
    );
    return {
      id: seedUuid('review', visit.id),
      userId: visit.userId,
      venueId: visit.venueId,
      visitId: visit.id,
      ...picked,
      createdAt,
    };
  });
}

function buildFavorites(r, people, venues) {
  const active = venues.filter((v) => v.status === 'active');
  const rows = [];
  for (const person of people.filter((p) => p.kind === 'member')) {
    const pr = r.fork(person.key);
    let slugs = person.favorites;
    if (!slugs) {
      if (!pr.chance(0.5)) continue;
      const pool = person.habits ? homeVenues(person, 3) : active;
      slugs = pr.sample(pool, pr.int(1, Math.min(4, pool.length))).map((v) => v.slug);
    }
    for (const slug of slugs) {
      const venue = venues.find((v) => v.slug === slug);
      const createdAt = Math.max(person.signupAt + pr.int(1, 48) * HOUR_MS, venue.createdAt);
      rows.push({
        userId: person.id,
        venueId: venue.id,
        createdAt: Math.min(createdAt, ANCHOR - HOUR_MS),
      });
    }
  }
  return rows;
}

const PAYOUT_MONTHS = [
  {
    month: '2026-08',
    start: '2026-08-01',
    end: '2026-08-31',
    status: 'paid',
    paidAt: localMs('2026-09-10', '12:00'),
  },
  { month: '2026-09', start: '2026-09-01', end: '2026-09-30', status: 'approved', paidAt: null },
  { month: '2026-10', start: '2026-10-01', end: '2026-10-31', status: 'draft', paidAt: null },
];

function buildPayouts(venues, visits) {
  const rows = [];
  for (const venue of venues) {
    for (const m of PAYOUT_MONTHS) {
      const count = visits.filter(
        (v) => v.venueId === venue.id && localMonth(v.checkedInAt) === m.month,
      ).length;
      if (count === 0) continue;
      rows.push({
        id: seedUuid('payout', venue.slug, m.month),
        venueId: venue.id,
        periodStart: m.start,
        periodEnd: m.end,
        visitsCount: count,
        amountUzs: count * PAYOUT_RATE_UZS[venue.tier],
        status: m.status,
        paidAt: m.paidAt,
      });
    }
  }
  return rows;
}

export function buildExtras(rng, ctx) {
  const reviews = buildReviews(rng.fork('reviews'), ctx);
  const favorites = buildFavorites(rng.fork('favorites'), ctx.people, ctx.venues);
  const notifications = buildNotifications(rng.fork('notifications'), { ...ctx, reviews });
  const payouts = buildPayouts(ctx.venues, ctx.visits);
  const preferences = ctx.people.map((p) => ({
    userId: p.id,
    reminders: p.reminders,
    marketing: p.marketing,
    quietHours: p.quietHours,
    createdAt: p.signupAt + 2 * MINUTE_MS,
  }));
  const lonely = rng
    .fork('deletion')
    .pick(ctx.people.filter((p) => p.kind === 'member' && !p.featured && p.scenario === 'none'));
  const deletionRequests = [
    {
      id: seedUuid('deletion', lonely.key),
      userId: lonely.id,
      requestedAt: ANCHOR - 20 * HOUR_MS,
      exportRequested: true,
    },
  ];
  return { reviews, favorites, notifications, payouts, preferences, deletionRequests };
}
