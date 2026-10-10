/**
 * Pure membership rules: quota, tier access, per-venue cap, capacity, cancellation window.
 * In demo mode (ADR-032) they are enforced on the device; with Supabase the same rules run in
 * rpc_book / rpc_cancel_booking and these functions only drive UI previews (CLAUDE.md).
 */
export type PlanRules = {
  code: string;
  visitsPerMonth: number;
  maxVenueTier: number;
  perVenueMonthlyCap: number;
  priceUzs: number;
};

export type SubscriptionState = {
  planCode: string;
  status: 'active' | 'cancelled';
  periodStart: number;
  periodEnd: number;
  autoRenew: boolean;
};

export type BookingStatus = 'confirmed' | 'cancelled' | 'late_cancelled';

export type BookingRecord = {
  id: string;
  venueId: string;
  /** Class session id, or null for a drop-in visit. */
  sessionId: string | null;
  startsAt: number;
  endsAt: number;
  status: BookingStatus;
  createdAt: number;
};

export type BookingError =
  | 'NO_SUBSCRIPTION'
  | 'SUBSCRIPTION_EXPIRED'
  | 'TIER_NOT_ALLOWED'
  | 'QUOTA_EXCEEDED'
  | 'VENUE_CAP_EXCEEDED'
  | 'CLASS_FULL'
  | 'ALREADY_BOOKED'
  | 'IN_THE_PAST';

export const PERIOD_DAYS = 30;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Bookings that consume a visit: active ones and late cancellations (PLAN §3). */
export function consumesVisit(booking: BookingRecord): boolean {
  return booking.status === 'confirmed' || booking.status === 'late_cancelled';
}

export function isActive(sub: SubscriptionState | null, now: number): sub is SubscriptionState {
  return sub !== null && now < sub.periodEnd;
}

export function visitsUsed(bookings: BookingRecord[], sub: SubscriptionState): number {
  return bookings.filter(
    (b) => consumesVisit(b) && b.startsAt >= sub.periodStart && b.startsAt < sub.periodEnd,
  ).length;
}

export function visitsLeft(
  plan: PlanRules,
  bookings: BookingRecord[],
  sub: SubscriptionState,
): number {
  return Math.max(0, plan.visitsPerMonth - visitsUsed(bookings, sub));
}

export type BookingRequest = {
  venueId: string;
  venueTier: number;
  sessionId: string | null;
  startsAt: number;
  /** Remaining class spots (ignored for drop-ins). */
  spotsLeft: number;
};

export function checkBooking(
  request: BookingRequest,
  plan: PlanRules | undefined,
  sub: SubscriptionState | null,
  bookings: BookingRecord[],
  now: number,
): BookingError | null {
  if (!sub || !plan) return 'NO_SUBSCRIPTION';
  if (!isActive(sub, now)) return 'SUBSCRIPTION_EXPIRED';
  if (request.startsAt <= now) return 'IN_THE_PAST';
  if (request.venueTier > plan.maxVenueTier) return 'TIER_NOT_ALLOWED';
  const active = bookings.filter((b) => b.status === 'confirmed');
  const duplicate = request.sessionId
    ? active.some((b) => b.sessionId === request.sessionId)
    : active.some(
        (b) =>
          b.sessionId === null &&
          b.venueId === request.venueId &&
          Math.abs(b.startsAt - request.startsAt) < DAY_MS / 2,
      );
  if (duplicate) return 'ALREADY_BOOKED';
  if (visitsLeft(plan, bookings, sub) <= 0) return 'QUOTA_EXCEEDED';
  const atVenue = bookings.filter(
    (b) => consumesVisit(b) && b.venueId === request.venueId && b.startsAt >= sub.periodStart,
  ).length;
  if (atVenue >= plan.perVenueMonthlyCap) return 'VENUE_CAP_EXCEEDED';
  if (request.sessionId && request.spotsLeft <= 0) return 'CLASS_FULL';
  return null;
}

/** Free cancellation until `windowMin` minutes before the start; later it consumes the visit. */
export function cancellationOutcome(
  booking: BookingRecord,
  windowMin: number,
  now: number,
): 'cancelled' | 'late_cancelled' {
  return now <= booking.startsAt - windowMin * 60_000 ? 'cancelled' : 'late_cancelled';
}

/**
 * Upgrade proration: pay the price difference for the days left in the period (PLAN §3).
 * Downgrades are free and take effect at the next renewal.
 */
export function upgradeCharge(
  from: PlanRules,
  to: PlanRules,
  sub: SubscriptionState,
  now: number,
): number {
  if (to.priceUzs <= from.priceUzs) return 0;
  const daysLeft = Math.max(0, Math.ceil((sub.periodEnd - now) / DAY_MS));
  return Math.round(((to.priceUzs - from.priceUzs) * daysLeft) / PERIOD_DAYS / 1000) * 1000;
}
