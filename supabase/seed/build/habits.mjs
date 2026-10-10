/**
 * Member habits used by the visit simulation: where a member likes to go (home venues ranked by
 * distance from their district and two favourite categories), how often, and at what time of day.
 */
import { CATEGORIES, categoryBySlug } from '../data/categories.mjs';
import { DISTRICTS, distanceM } from '../data/places.mjs';
import { MINUTE_MS, dayStart, toMinutes, weekdayOfOffset } from '../lib/time.mjs';
import { segmentRange } from './catalog.mjs';

const VISITS_PER_WEEK = { basic: [1.3, 2.2], standard: [2, 3.6], premium: [2.2, 4.5] };

/** Weighted shuffle: repeatedly draws by weight without replacement. */
function weightedOrder(rng, items, weightOf) {
  const pool = [...items];
  const order = [];
  while (pool.length > 0) {
    const item = rng.weighted(pool, weightOf);
    order.push(item);
    pool.splice(pool.indexOf(item), 1);
  }
  return order;
}

/**
 * Adds `habits` to every member: venue preference order (all active venues), how many of them
 * they rotate between, and visits per week for their plan.
 */
export function assignHabits(rng, people, venues) {
  const active = venues.filter((v) => v.status === 'active');
  for (const person of people) {
    if (person.kind !== 'member') continue;
    const r = rng.fork(`habits:${person.key}`);
    const centre = DISTRICTS[person.district];
    const home = {
      lat: centre.lat + r.float(-0.008, 0.008),
      lng: centre.lng + r.float(-0.008, 0.008),
    };
    const liked = new Set(r.sample(CATEGORIES, 2).map((c) => c.slug));
    const fixed = (person.home ?? [])
      .map((slug) => active.find((v) => v.slug === slug))
      .filter(Boolean);
    const rest = active.filter((v) => !fixed.includes(v));
    const order = [
      ...fixed,
      ...weightedOrder(
        r,
        rest,
        (v) => (liked.has(v.category) ? 4 : 1) / (0.5 + distanceM(home, v) / 1000) ** 1.5,
      ),
    ];
    const [lo, hi] = VISITS_PER_WEEK[person.plan ?? 'basic'];
    person.habits = {
      order,
      size: fixed.length > 0 ? fixed.length : r.int(2, 4),
      perWeek: r.float(lo, hi),
    };
  }
}

/** The member's usual venues that a plan with `maxTier` admits. */
export function homeVenues(person, maxTier) {
  const allowed = person.habits.order.filter((v) => v.tier <= maxTier);
  return allowed.slice(0, Math.max(person.habits.size, 1));
}

function timeWeight(minutes) {
  const hour = minutes / 60;
  if (hour < 6) return 0.1;
  if (hour < 9.5) return 2;
  if (hour < 12) return 0.8;
  if (hour < 14) return 1;
  if (hour < 17) return 0.6;
  if (hour < 21) return 3;
  return 0.5;
}

/**
 * A drop-in slot at `venue` on day `d`: { startsAt, endsAt }, or null when nothing fits.
 * Men are never placed in women-only windows. `fixedTime` ("HH:MM") skips the random choice.
 */
export function pickDropIn(rng, venue, d, gender, fixedTime) {
  const visitMin = categoryBySlug(venue.category).visitMin;
  const segments = venue.hours[weekdayOfOffset(d)].filter(
    (seg) => !(seg.womenOnly && gender !== 'female'),
  );
  const candidates = [];
  for (const seg of segments) {
    const [opens, closes] = segmentRange(seg);
    for (let m = Math.ceil(opens / 30) * 30; m + visitMin <= closes && m < 1440; m += 30)
      candidates.push(m);
  }
  let start;
  if (fixedTime) {
    start = toMinutes(fixedTime);
    const fits = segments.some((seg) => {
      const [opens, closes] = segmentRange(seg);
      return start >= opens && start + visitMin <= closes;
    });
    if (!fits) return null;
  } else {
    if (candidates.length === 0) return null;
    start = rng.weighted(candidates, timeWeight);
  }
  const startsAt = dayStart(d) + start * MINUTE_MS;
  return { startsAt, endsAt: startsAt + visitMin * MINUTE_MS };
}
