import raw from './demoData.json';
import type {
  Category,
  ClassSession,
  ClassTemplate,
  I18nText,
  Locale,
  Plan,
  Review,
  Trainer,
  Venue,
  VenueFilters,
  VenueListItem,
} from './types';

/**
 * Demo catalog repository (ADR-032): the deterministic Tashkent seed exported by
 * scripts/demo/export-demo-data.mjs. Pure functions; React hooks live in useCatalog.ts.
 */
const data = raw as unknown as {
  plans: Plan[];
  categories: Category[];
  venues: Venue[];
  trainers: Trainer[];
  classes: ClassTemplate[];
  reviews: Review[];
};

/** Amir Temur Square — the default "you are here" until location permission is granted. */
export const CITY_CENTER = { lat: 41.3111, lng: 69.2797 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function text(value: I18nText, locale: Locale): string {
  return value[locale] || value.ru;
}

export function getPlans(): Plan[] {
  return [...data.plans].sort((a, b) => a.sort - b.sort);
}

export function getPlan(code: string): Plan | undefined {
  return data.plans.find((plan) => plan.code === code);
}

export function getCategories(): Category[] {
  return [...data.categories].sort((a, b) => a.sort - b.sort);
}

export function getCategory(slug: string): Category | undefined {
  return data.categories.find((category) => category.slug === slug);
}

export function getVenue(id: string): Venue | undefined {
  return data.venues.find((venue) => venue.id === id || venue.slug === id);
}

export function getTrainers(venueId: string): Trainer[] {
  return data.trainers.filter((trainer) => trainer.venueId === venueId);
}

export function getTrainer(id: string | null): Trainer | undefined {
  return id === null ? undefined : data.trainers.find((trainer) => trainer.id === id);
}

export function getReviews(venueId: string): Review[] {
  return data.reviews
    .filter((review) => review.venueId === venueId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getClasses(venueId: string): ClassTemplate[] {
  return data.classes.filter((template) => template.venueId === venueId);
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minutes(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

export function isOpenAt(venue: Venue, at: Date): boolean {
  const now = at.getHours() * 60 + at.getMinutes();
  return (venue.hours[String(at.getDay())] ?? []).some(
    (slot) => now >= minutes(slot.opens) && now < minutes(slot.closes),
  );
}

export function searchVenues(
  filters: VenueFilters,
  locale: Locale,
  now: Date = new Date(),
  origin: { lat: number; lng: number } = CITY_CENTER,
): VenueListItem[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const items = data.venues
    .map((venue) => ({
      ...venue,
      distanceKm: distanceKm(origin.lat, origin.lng, venue.lat, venue.lng),
      openNow: isOpenAt(venue, now),
    }))
    .filter((venue) => !filters.category || venue.category === filters.category)
    .filter((venue) => !filters.openNow || venue.openNow)
    .filter((venue) => filters.maxTier == null || venue.tier <= filters.maxTier)
    .filter((venue) => {
      if (!query) return true;
      const category = getCategory(venue.category);
      const haystack = [
        text(venue.name, locale),
        text(venue.street, locale),
        venue.district,
        category ? text(category.name, locale) : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  const sort = filters.sort ?? 'recommended';
  return items.sort((a, b) => {
    if (sort === 'distance') return a.distanceKm - b.distanceKm;
    if (sort === 'rating') return b.rating - a.rating || b.ratingCount - a.ratingCount;
    return b.rating * 10 + b.popularity / 20 - (a.rating * 10 + a.popularity / 20);
  });
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Class occurrences at a venue on the calendar day of `day`, from now on, sorted by time. */
export function getSessions(venueId: string, day: Date, now: Date = new Date()): ClassSession[] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return getClasses(venueId)
    .flatMap((template) =>
      template.slots
        .filter(([weekday]) => weekday === start.getDay())
        .map(([, time]) => {
          const startsAt = start.getTime() + minutes(time) * 60_000;
          const id = `${template.id}@${startsAt}`;
          return {
            id,
            classId: template.id,
            venueId,
            name: template.name,
            trainerId: template.trainerId,
            startsAt,
            endsAt: startsAt + template.durationMin * 60_000,
            capacity: template.capacity,
            takenByOthers: hash(id) % Math.max(1, template.capacity),
          };
        }),
    )
    .filter((session) => session.startsAt > now.getTime())
    .sort((a, b) => a.startsAt - b.startsAt);
}

/** The next `count` calendar days starting today (for day pickers). */
export function nextDays(count: number, now: Date = new Date()): Date[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Array.from({ length: count }, (_, i) => new Date(today.getTime() + i * DAY_MS));
}
