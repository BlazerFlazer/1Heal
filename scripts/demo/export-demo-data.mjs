// Exports the deterministic Tashkent seed (supabase/seed) into a compact fixture for the app's
// demo mode (ADR-032). Run: node scripts/demo/export-demo-data.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildModel } from '../../supabase/seed/generate.mjs';

const m = buildModel();
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k] ?? null]));

const ratings = new Map();
for (const r of m.reviews) {
  const cur = ratings.get(r.venueId) ?? { sum: 0, count: 0 };
  ratings.set(r.venueId, { sum: cur.sum + r.rating, count: cur.count + 1 });
}
const visitsByVenue = new Map();
for (const v of m.visits) visitsByVenue.set(v.venueId, (visitsByVenue.get(v.venueId) ?? 0) + 1);

const data = {
  plans: m.plans.map((p) =>
    pick(p, [
      'id',
      'code',
      'sort',
      'priceUzs',
      'visitsPerMonth',
      'maxVenueTier',
      'perVenueMonthlyCap',
      'name',
      'perks',
    ]),
  ),
  categories: m.categories.map((c) => pick(c, ['id', 'slug', 'icon', 'name', 'sort'])),
  venues: m.venues.map((v) => {
    const r = ratings.get(v.id);
    return {
      ...pick(v, [
        'id',
        'slug',
        'category',
        'tier',
        'priceTier',
        'district',
        'lat',
        'lng',
        'name',
        'street',
        'address',
        'description',
        'amenities',
        'phone',
        'cancellationWindowMin',
        'womenOnlyHours',
      ]),
      hours: v.hours,
      photos: m.photos
        .filter((p) => p.venueId === v.id)
        .sort((a, b) => a.sort - b.sort)
        .map((p) => p.path),
      rating: Math.round((r ? r.sum / r.count : 4.6 + (v.slug.length % 4) / 10) * 10) / 10,
      ratingCount: r ? r.count + 12 : 8 + (v.slug.length % 17),
      popularity: visitsByVenue.get(v.id) ?? 0,
    };
  }),
  trainers: m.trainers.map((t) => pick(t, ['id', 'venueId', 'name', 'bio', 'specialties'])),
  classes: m.templates.map((t) =>
    pick(t, [
      'id',
      'venueId',
      'key',
      'name',
      'description',
      'durationMin',
      'capacity',
      'level',
      'trainerId',
      'slots',
    ]),
  ),
  reviews: m.reviews.map((r) => ({
    ...pick(r, ['id', 'venueId', 'rating', 'text', 'createdAt']),
    author: (m.people.find((p) => p.id === r.userId)?.fullName ?? '').split(' ')[0] ?? '',
  })),
};

const out = fileURLToPath(new URL('../../src/services/demo/demoData.json', import.meta.url));
writeFileSync(out, JSON.stringify(data));
console.log('wrote', out, Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])));
