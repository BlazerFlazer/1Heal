/**
 * Catalog: plans, categories, venues with hours/photos/trainers/class templates, and the class
 * timetable for [ANCHOR - 60 days, ANCHOR + 14 days). Past sessions are 'completed' so visit
 * history can reference real classes; future ones are 'scheduled'. pg_cron rolls the timetable
 * forward from M5 on; until then regenerate or move ANCHOR_DATE (docs/SEED.md).
 */
import { CATEGORIES, categoryBySlug } from '../data/categories.mjs';
import { CLASSES } from '../data/classes.mjs';
import { randomPerson } from '../data/people.mjs';
import { CITY, DISTRICTS, HOURS } from '../data/places.mjs';
import { PLANS } from '../data/platform.mjs';
import { trainerBio } from '../data/texts.mjs';
import { VENUES_A } from '../data/venues-a.mjs';
import { VENUES_B } from '../data/venues-b.mjs';
import { placeholderBlurhash, seedUuid } from '../lib/ids.mjs';
import {
  DAY_MS,
  HISTORY_DAYS,
  MINUTE_MS,
  TIMETABLE_DAYS_AHEAD,
  TZ,
  dayStart,
  localMs,
  toMinutes,
  weekdayOfOffset,
} from '../lib/time.mjs';

const SLOT_TIMES = [
  '07:00',
  '07:30',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:30',
  '13:00',
  '17:00',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
];

/** Splits a weekday's opening slots around women-only windows -> [{opens, closes, womenOnly}]. */
function weekdaySegments(preset, womenOnly, weekday) {
  let segments = (HOURS[preset][weekday] ?? []).map(([opens, closes]) => ({
    opens,
    closes,
    womenOnly: false,
  }));
  for (const [day, from, to] of womenOnly ?? []) {
    if (day !== weekday) continue;
    const next = [];
    for (const seg of segments) {
      const [o, c, a, b] = [seg.opens, seg.closes, from, to].map(toMinutes);
      if (a < o || b > c) {
        next.push(seg);
        continue;
      }
      if (a > o) next.push({ opens: seg.opens, closes: from, womenOnly: false });
      next.push({ opens: from, closes: to, womenOnly: true });
      if (b < c) next.push({ opens: to, closes: seg.closes, womenOnly: false });
    }
    segments = next;
  }
  return segments;
}

/** [start, end) minutes of a segment, overnight slots extended past midnight. */
export function segmentRange(seg) {
  const opens = toMinutes(seg.opens);
  let closes = toMinutes(seg.closes);
  if (closes <= opens) closes += 1440;
  return [opens, closes];
}

function buildSlots(rng, venue, key, durationMin, taken) {
  const slotCount = rng.int(2, 4);
  const slots = [];
  for (const weekday of rng.shuffle([0, 1, 2, 3, 4, 5, 6])) {
    if (slots.length >= slotCount) break;
    const fits = SLOT_TIMES.filter((time) => {
      if (taken.has(`${weekday}:${time}`)) return false;
      const start = toMinutes(time);
      return venue.hours[weekday].some((seg) => {
        const [opens, closes] = segmentRange(seg);
        return !seg.womenOnly && start >= opens && start + durationMin <= closes;
      });
    });
    if (fits.length === 0) continue;
    const time = rng.pick(fits);
    taken.add(`${weekday}:${time}`);
    slots.push([weekday, time]);
  }
  if (slots.length === 0) throw new Error(`no class slot fits ${venue.slug}/${key}`);
  return slots;
}

export function buildCatalog(rng) {
  const plans = PLANS.map((plan) => ({ ...plan, id: seedUuid('plan', plan.code) }));
  const categories = CATEGORIES.map((category, index) => ({
    ...category,
    id: seedUuid('category', category.slug),
    sort: (index + 1) * 10,
  }));
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  const venues = [];
  const hours = [];
  const photos = [];
  const trainers = [];
  const templates = [];
  const sessions = [];

  for (const def of [...VENUES_A, ...VENUES_B]) {
    const r = rng.fork(`venue:${def.slug}`);
    const category = categoryBySlug(def.category);
    const district = DISTRICTS[def.district];
    const venue = {
      ...def,
      id: seedUuid('venue', def.slug),
      categoryId: categoryId.get(def.category),
      status: def.status ?? 'active',
      address: Object.fromEntries(
        ['ru', 'uz', 'en'].map((l) => [l, `${def.street[l]}, ${district[l]}, ${CITY[l]}`]),
      ),
      phone: `+998712${r.digits(6)}`,
      website: r.chance(0.5) ? `https://${def.slug}.example` : null,
      tz: TZ,
      cancellationWindowMin: def.cancellationWindowMin ?? 120,
      womenOnlyHours: def.womenOnly
        ? def.womenOnly.map(([weekday, opens, closes]) => ({ weekday, opens, closes }))
        : null,
      createdAt:
        def.status === 'draft'
          ? dayStart(-5) + 11 * 60 * MINUTE_MS
          : localMs('2026-03-02', '10:00') + r.int(0, 150) * DAY_MS,
      hours: {},
    };
    venues.push(venue);

    for (let weekday = 0; weekday < 7; weekday += 1) {
      venue.hours[weekday] = weekdaySegments(def.hours, def.womenOnly, weekday);
      for (const seg of venue.hours[weekday]) {
        hours.push({
          id: seedUuid('hours', def.slug, weekday, seg.opens),
          venueId: venue.id,
          weekday,
          ...seg,
        });
      }
    }

    const photoCount = r.int(2, 5);
    for (let n = 1; n <= photoCount; n += 1) {
      photos.push({
        id: seedUuid('photo', def.slug, n),
        venueId: venue.id,
        path: `https://picsum.photos/seed/${def.slug}-${n}/1200/800`,
        sort: n - 1,
        blurhash: placeholderBlurhash(r, category.tint),
      });
    }

    const venueTrainers = Array.from({ length: r.int(1, 3) }, (_, n) => ({
      id: seedUuid('trainer', def.slug, n + 1),
      venueId: venue.id,
      name: randomPerson(r).fullName,
      bio: trainerBio(category.focus, r.int(3, 15)),
      specialties: [],
    }));
    trainers.push(...venueTrainers);

    const taken = new Set();
    def.classes.forEach((entry, index) => {
      const key = typeof entry === 'string' ? entry : entry.key;
      const spec = CLASSES[key];
      if (!spec) throw new Error(`unknown class ${key} at ${def.slug}`);
      const trainer = venueTrainers[index % venueTrainers.length];
      if (!trainer.specialties.includes(key)) trainer.specialties.push(key);
      const slots =
        typeof entry === 'string'
          ? buildSlots(r, venue, key, spec.durationMin, taken)
          : entry.slots;
      for (const [weekday, time] of slots) taken.add(`${weekday}:${time}`);
      templates.push({
        id: seedUuid('template', def.slug, key),
        venueId: venue.id,
        key,
        ...spec,
        trainerId: trainer.id,
        slots,
        fixed: typeof entry !== 'string',
      });
    });
    for (const trainer of venueTrainers) {
      if (trainer.specialties.length === 0) trainer.specialties.push(templates.at(-1).key);
    }
  }

  const venueById = new Map(venues.map((v) => [v.id, v]));
  for (const template of templates) {
    const venue = venueById.get(template.venueId);
    if (venue.status === 'paused') continue;
    const r = rng.fork(`sessions:${template.id}`);
    const firstDay = venue.status === 'draft' ? 0 : -HISTORY_DAYS;
    for (let d = firstDay; d < TIMETABLE_DAYS_AHEAD; d += 1) {
      const weekday = weekdayOfOffset(d);
      for (const [slotDay, time] of template.slots) {
        if (slotDay !== weekday) continue;
        const startsAt = dayStart(d) + toMinutes(time) * MINUTE_MS;
        const cancelled = !template.fixed && r.chance(0.02);
        sessions.push({
          id: seedUuid('session', template.id, d, time),
          templateId: template.id,
          venueId: venue.id,
          trainerId: template.trainerId,
          day: d,
          time,
          startsAt,
          endsAt: startsAt + template.durationMin * MINUTE_MS,
          capacity: template.capacity,
          bookedCount: 0,
          waitlistCount: 0,
          status: cancelled ? 'cancelled' : d < 0 ? 'completed' : 'scheduled',
        });
      }
    }
  }

  return { plans, categories, venues, hours, photos, trainers, templates, sessions };
}
