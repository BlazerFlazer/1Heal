import { isOpenAt } from '@/services/demo/catalog';
import type { OpeningSlot, Venue } from '@/services/demo/types';

const HOUR_MS = 60 * 60 * 1000;

/** Opening slots on the calendar day of `date` (hours are keyed by JS weekday). */
export function slotsOn(venue: Venue, date: Date): OpeningSlot[] {
  return venue.hours[String(date.getDay())] ?? [];
}

/** "06:00–23:00, 08:00–12:00" — EN DASH between the ends of each slot. */
export function formatSlots(slots: readonly OpeningSlot[]): string {
  return slots.map((slot) => `${slot.opens}–${slot.closes}`).join(', ');
}

/**
 * Drop-in start times: the next `count` whole hours, starting after `now`, at which the venue is
 * open. Late in the evening the list continues into tomorrow's opening hours; never beyond it.
 */
export function dropInSlots(venue: Venue, now: Date, count = 6): Date[] {
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getTime();
  const first = new Date(now.getTime());
  first.setMinutes(0, 0, 0);
  const slots: Date[] = [];
  for (
    let at = first.getTime() + HOUR_MS;
    at < tomorrowEnd && slots.length < count;
    at += HOUR_MS
  ) {
    const candidate = new Date(at);
    if (isOpenAt(venue, candidate)) slots.push(candidate);
  }
  return slots;
}

/** True when `a` and `b` fall on the same local calendar day. */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
