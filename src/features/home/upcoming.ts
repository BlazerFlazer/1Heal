import type { BookingRecord } from '@/domain/membership';
import { getClasses, getVenue, text } from '@/services/demo/catalog';
import type { Locale, Venue } from '@/services/demo/types';

const MINUTE_MS = 60_000;
/** Beyond this the card shows "Tomorrow, 09:00" instead of a countdown. */
const COUNTDOWN_LIMIT_MIN = 12 * 60;

/** The member's next confirmed booking that has not finished yet. */
export function nextConfirmedBooking(
  bookings: readonly BookingRecord[],
  now: number,
): BookingRecord | undefined {
  return bookings
    .filter((booking) => booking.status === 'confirmed' && booking.endsAt > now)
    .sort((a, b) => a.startsAt - b.startsAt)[0];
}

export type Countdown = { key: 'inMinutes' | 'inHours'; count: number };

/** "In 35 min" / "In 2 h" while the start is close; `null` once started or more than 12 h away. */
export function countdown(startsAt: number, now: number): Countdown | null {
  const minutes = Math.ceil((startsAt - now) / MINUTE_MS);
  if (minutes <= 0 || minutes > COUNTDOWN_LIMIT_MIN) return null;
  if (minutes < 60) return { key: 'inMinutes', count: minutes };
  return { key: 'inHours', count: Math.round(minutes / 60) };
}

export type BookingSummary = { venue: Venue | undefined; className: string | null };

/** Venue and class name for a booking; a drop-in visit has no class (`className` null). */
export function describeBooking(booking: BookingRecord, locale: Locale): BookingSummary {
  const venue = getVenue(booking.venueId);
  const classId = booking.sessionId?.split('@')[0];
  const template = classId
    ? getClasses(booking.venueId).find((item) => item.id === classId)
    : undefined;
  return { venue, className: template ? text(template.name, locale) : null };
}
