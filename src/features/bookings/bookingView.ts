import type { BookingRecord } from '@/domain/membership';
import { getClasses, getVenue } from '@/services/demo/catalog';
import type { ClassTemplate, Venue } from '@/services/demo/types';

/** What the member sees: the stored status plus where "now" falls relative to the visit. */
export type BookingPhase = 'upcoming' | 'ongoing' | 'visited' | 'cancelled' | 'late_cancelled';

export type BookingView = {
  booking: BookingRecord;
  venue: Venue | undefined;
  /** The class template for class bookings; undefined for drop-ins. */
  classTemplate: ClassTemplate | undefined;
  /** Display end: the class duration when known, otherwise the stored end. */
  endsAt: number;
};

export type DayGroup = { key: string; date: Date; items: BookingRecord[] };

export function bookingPhase(booking: BookingRecord, now: number): BookingPhase {
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.status === 'late_cancelled') return 'late_cancelled';
  if (booking.endsAt <= now) return 'visited';
  return booking.startsAt <= now ? 'ongoing' : 'upcoming';
}

export function isUpcoming(booking: BookingRecord, now: number): boolean {
  return booking.status === 'confirmed' && booking.endsAt > now;
}

/** Upcoming ascending by start; everything else (visited, cancelled) newest first. */
export function splitBookings(
  bookings: readonly BookingRecord[],
  now: number,
): { upcoming: BookingRecord[]; history: BookingRecord[] } {
  const upcoming = bookings
    .filter((b) => isUpcoming(b, now))
    .sort((a, b) => a.startsAt - b.startsAt);
  const history = bookings
    .filter((b) => !isUpcoming(b, now))
    .sort((a, b) => b.startsAt - a.startsAt);
  return { upcoming, history };
}

/** Session ids are `${classId}@${startsAtMs}`; the class id is everything before the last "@". */
export function classIdOf(sessionId: string): string {
  const at = sessionId.lastIndexOf('@');
  return at === -1 ? sessionId : sessionId.slice(0, at);
}

export function describeBooking(booking: BookingRecord): BookingView {
  const venue = getVenue(booking.venueId);
  const classId = booking.sessionId === null ? null : classIdOf(booking.sessionId);
  const classTemplate =
    classId === null ? undefined : getClasses(booking.venueId).find((c) => c.id === classId);
  const endsAt = classTemplate
    ? booking.startsAt + classTemplate.durationMin * 60_000
    : booking.endsAt;
  return { booking, venue, classTemplate, endsAt };
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Groups bookings (already sorted) by local calendar day, keeping order. */
export function groupByDay(bookings: readonly BookingRecord[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const booking of bookings) {
    const date = new Date(booking.startsAt);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(booking);
    } else {
      groups.push({
        key,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        items: [booking],
      });
    }
  }
  return groups;
}

/** Whole local days from `now` to `date` (0 = today, 1 = tomorrow). */
export function daysFromNow(date: Date, now: number): number {
  const today = new Date(now);
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

/** Yandex Maps works best in Uzbekistan; the pin is longitude first. */
export function directionsUrl(venue: Pick<Venue, 'lat' | 'lng'>): string {
  return `https://yandex.uz/maps/?pt=${venue.lng},${venue.lat}&z=17&l=map`;
}
