/**
 * Self-checks run before seed.sql is written. They mirror supabase/tests/seed/*.test.ts, which
 * check the same invariants on the database, so a bad generator change fails here first with a
 * readable message.
 */
import { BBOX, CITY_CENTRE, distanceM } from './data/places.mjs';
import { CATEGORIES } from './data/categories.mjs';
import { segmentRange } from './build/catalog.mjs';
import { ANCHOR, MINUTE_MS, dayStart, toMinutes } from './lib/time.mjs';

const CYRILLIC = /[Ѐ-ӿ]/;
const BAD_UZ_APOSTROPHE = /['`‘’]/;

function check(condition, message) {
  if (!condition) throw new Error(`seed validation: ${message}`);
}

/** ru/uz/en non-empty; uz in Latin with ʻ/ʼ (docs/COPY.md); en without Cyrillic. */
export function checkI18n(value, where, { ruCyrillic = false } = {}) {
  for (const locale of ['ru', 'uz', 'en']) {
    check(
      typeof value?.[locale] === 'string' && value[locale].length > 0,
      `${where}: missing ${locale}`,
    );
  }
  check(
    !CYRILLIC.test(value.uz) && !BAD_UZ_APOSTROPHE.test(value.uz),
    `${where}: uz text "${value.uz}"`,
  );
  check(!CYRILLIC.test(value.en), `${where}: en text has Cyrillic`);
  if (ruCyrillic) check(CYRILLIC.test(value.ru), `${where}: ru text has no Cyrillic`);
}

function checkCatalog(m) {
  check(
    m.plans.length === 3 && m.categories.length === 12 && m.venues.length === 30,
    'catalog sizes',
  );
  const active = m.venues.filter((v) => v.status === 'active');
  check(active.length >= 25, 'at least 25 active venues');
  for (const c of CATEGORIES)
    check(
      active.some((v) => v.category === c.slug),
      `no active venue in ${c.slug}`,
    );
  check(new Set(m.venues.map((v) => v.slug)).size === m.venues.length, 'venue slugs unique');
  const near = active.filter((v) => distanceM(CITY_CENTRE, v) <= 5000);
  check(near.length >= 10, `only ${near.length} active venues within 5 km of the centre`);
  for (const v of m.venues) {
    check(
      v.lat >= BBOX.minLat && v.lat <= BBOX.maxLat && v.lng >= BBOX.minLng && v.lng <= BBOX.maxLng,
      `${v.slug} outside Tashkent`,
    );
    check(
      new Set(m.hours.filter((h) => h.venueId === v.id).map((h) => h.weekday)).size === 7,
      `${v.slug} hours`,
    );
    const photos = m.photos.filter((p) => p.venueId === v.id).length;
    check(photos >= 2 && photos <= 5, `${v.slug} photos`);
    const trainers = m.trainers.filter((t) => t.venueId === v.id).length;
    check(trainers >= 1 && trainers <= 3, `${v.slug} trainers`);
    const templates = m.templates.filter((t) => t.venueId === v.id).length;
    check(templates >= 1 && templates <= 4, `${v.slug} templates`);
    for (const field of ['name', 'address', 'description'])
      checkI18n(v[field], `${v.slug}.${field}`, { ruCyrillic: field !== 'name' });
  }
  for (const c of m.categories) checkI18n(c.name, `category ${c.slug}`, { ruCyrillic: true });
  for (const p of m.plans) {
    checkI18n(p.name, `plan ${p.code}`);
    p.perks.forEach((perk) =>
      checkI18n(perk, `plan ${p.code} perk ${perk.key}`, { ruCyrillic: true }),
    );
  }
  for (const t of m.templates) {
    checkI18n(t.name, `template ${t.key}`);
    checkI18n(t.description, `template ${t.key} description`, { ruCyrillic: true });
  }
  for (const t of m.trainers) checkI18n(t.bio, `trainer ${t.name}`, { ruCyrillic: true });

  const venueById = new Map(m.venues.map((v) => [v.id, v]));
  for (const s of m.sessions) {
    const venue = venueById.get(s.venueId);
    const weekday = new Date(s.startsAt + 5 * 60 * MINUTE_MS).getUTCDay();
    const start = toMinutes(s.time);
    const end = start + (s.endsAt - s.startsAt) / MINUTE_MS;
    const fits = venue.hours[weekday].some((seg) => {
      const [opens, closes] = segmentRange(seg);
      return !seg.womenOnly && start >= opens && end <= closes;
    });
    check(fits, `session ${venue.slug} ${s.time} outside opening hours`);
    check(s.bookedCount <= s.capacity, `session ${s.id} over capacity`);
    check(
      s.waitlistCount === 0 || s.bookedCount === s.capacity,
      `session ${s.id} waitlist while seats are free`,
    );
  }
}

function checkPeople(m) {
  const members = m.people.filter((p) => p.kind === 'member');
  check(members.length === 100, 'exactly 100 demo members');
  check(new Set(m.people.map((p) => p.phone)).size === m.people.length, 'phones unique');
  for (const p of m.people) {
    check(/^\+99890\d{7}$/.test(p.phone), `phone ${p.phone}`);
    check(p.phone.endsWith('00') === (p.kind !== 'member'), `phone ${p.phone} vs role ${p.kind}`);
  }
}

function checkActivity(m) {
  const planById = new Map(m.plans.map((p) => [p.id, p]));
  const venueById = new Map(m.venues.map((v) => [v.id, v]));
  const live = m.subscriptions.filter((s) => !['cancelled', 'expired'].includes(s.status));
  check(
    new Set(live.map((s) => s.userId)).size === live.length,
    'one non-terminal subscription per user',
  );
  for (const code of ['basic', 'standard', 'premium']) {
    const n = live.filter(
      (s) => s.status === 'active' && planById.get(s.planId).code === code,
    ).length;
    check(n === 20, `${n} active ${code} subscriptions, expected 20`);
  }
  for (const sub of m.subscriptions) {
    const plan = planById.get(sub.planId);
    const visits = m.visits.filter((v) => v.subscriptionId === sub.id);
    const bookings = m.bookings.filter((b) => b.subscriptionId === sub.id);
    const noShows = bookings.filter((b) => b.status === 'no_show').length;
    const upcoming = bookings.filter((b) => b.status === 'confirmed');
    check(sub.visitsUsed === visits.length + noShows, `visits_used of ${sub.id}`);
    check(sub.visitsUsed + upcoming.length <= plan.visitsPerMonth, `quota of ${sub.id}`);
    for (const venueId of new Set([...visits, ...upcoming].map((x) => x.venueId))) {
      const n =
        visits.filter((v) => v.venueId === venueId).length +
        upcoming.filter((b) => b.venueId === venueId).length;
      check(n <= plan.perVenueMonthlyCap, `per-venue cap of ${sub.id}`);
      check(venueById.get(venueId).tier <= plan.maxVenueTier, `tier rule of ${sub.id}`);
    }
    for (const v of visits)
      check(
        v.checkedInAt >= sub.periodStart && v.checkedInAt < sub.periodEnd && v.checkedInAt < ANCHOR,
        `visit ${v.id} outside its period`,
      );
    for (const b of bookings)
      check(
        b.startsAt >= sub.periodStart && b.startsAt < sub.periodEnd,
        `booking ${b.id} outside its period`,
      );
  }
  check(
    m.bookings.every(
      (b) => b.createdAt < b.startsAt && (!b.cancelledAt || b.cancelledAt > b.createdAt),
    ),
    'booking timestamps',
  );
  check(
    m.bookings
      .filter((b) => b.status === 'confirmed')
      .every((b) => b.startsAt >= ANCHOR && b.startsAt < dayStart(14)),
    'upcoming window',
  );
  check(
    m.reviews.length === 15 && new Set(m.reviews.map((r) => r.visitId)).size === 15,
    '15 reviews on distinct visits',
  );
  const visitById = new Map(m.visits.map((v) => [v.id, v]));
  for (const r of m.reviews) {
    const visit = visitById.get(r.visitId);
    check(
      visit.userId === r.userId && visit.venueId === r.venueId && r.createdAt > visit.checkedInAt,
      `review ${r.id}`,
    );
  }
  const txn = m.payments.map((p) => `${p.provider}:${p.providerTxnId}`);
  check(new Set(txn).size === txn.length, 'provider transaction ids unique');
  check(m.penalties.length === 1, `${m.penalties.length} penalties, expected the scripted one`);
  for (const n of m.notifications) {
    checkI18n(n.title, `notification ${n.kind}`, { ruCyrillic: true });
    checkI18n(n.body, `notification ${n.kind}`, { ruCyrillic: true });
  }
}

export function validateModel(model) {
  checkCatalog(model);
  checkPeople(model);
  checkActivity(model);
}
