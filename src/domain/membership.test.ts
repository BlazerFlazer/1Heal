import {
  cancellationOutcome,
  checkBooking,
  DAY_MS,
  upgradeCharge,
  visitsLeft,
  type BookingRecord,
  type PlanRules,
  type SubscriptionState,
} from './membership';

const NOW = Date.UTC(2026, 9, 10, 9, 0);
const basic: PlanRules = {
  code: 'basic',
  visitsPerMonth: 2,
  maxVenueTier: 1,
  perVenueMonthlyCap: 1,
  priceUzs: 199000,
};
const premium: PlanRules = { ...basic, code: 'premium', maxVenueTier: 3, priceUzs: 599000 };
const sub: SubscriptionState = {
  planCode: 'basic',
  status: 'active',
  periodStart: NOW - DAY_MS,
  periodEnd: NOW + 29 * DAY_MS,
  autoRenew: true,
};
const request = {
  venueId: 'v1',
  venueTier: 1,
  sessionId: null,
  startsAt: NOW + DAY_MS,
  spotsLeft: 5,
};
const booking = (over: Partial<BookingRecord>): BookingRecord => ({
  id: 'b',
  venueId: 'v1',
  sessionId: null,
  startsAt: NOW + DAY_MS,
  endsAt: NOW + DAY_MS + 3600_000,
  status: 'confirmed',
  createdAt: NOW,
  ...over,
});

describe('checkBooking', () => {
  it('allows a valid booking', () => {
    expect(checkBooking(request, basic, sub, [], NOW)).toBeNull();
  });
  it('requires a subscription', () => {
    expect(checkBooking(request, undefined, null, [], NOW)).toBe('NO_SUBSCRIPTION');
  });
  it('rejects expired subscriptions and past slots', () => {
    expect(checkBooking(request, basic, { ...sub, periodEnd: NOW - 1 }, [], NOW)).toBe(
      'SUBSCRIPTION_EXPIRED',
    );
    expect(checkBooking({ ...request, startsAt: NOW - 1 }, basic, sub, [], NOW)).toBe(
      'IN_THE_PAST',
    );
  });
  it('enforces tier, quota, per-venue cap, capacity and duplicates', () => {
    expect(checkBooking({ ...request, venueTier: 2 }, basic, sub, [], NOW)).toBe(
      'TIER_NOT_ALLOWED',
    );
    const two = [booking({ id: 'a', venueId: 'v2' }), booking({ id: 'b', venueId: 'v3' })];
    expect(checkBooking(request, basic, sub, two, NOW)).toBe('QUOTA_EXCEEDED');
    const late = [booking({ venueId: 'v1', status: 'late_cancelled', startsAt: NOW + 2 * DAY_MS })];
    expect(checkBooking(request, basic, sub, late, NOW)).toBe('VENUE_CAP_EXCEEDED');
    expect(checkBooking({ ...request, sessionId: 's1', spotsLeft: 0 }, premium, sub, [], NOW)).toBe(
      'CLASS_FULL',
    );
    expect(checkBooking(request, basic, sub, [booking({})], NOW)).toBe('ALREADY_BOOKED');
  });
});

describe('visitsLeft', () => {
  it('counts confirmed and late-cancelled bookings, not free cancellations', () => {
    const list = [booking({ status: 'late_cancelled' }), booking({ id: 'c', status: 'cancelled' })];
    expect(visitsLeft(basic, list, sub)).toBe(1);
  });
});

describe('cancellationOutcome', () => {
  it('is free until the window and consumes the visit after', () => {
    const b = booking({ startsAt: NOW + 3 * 3600_000 });
    expect(cancellationOutcome(b, 120, NOW)).toBe('cancelled');
    expect(cancellationOutcome(b, 120, NOW + 2 * 3600_000)).toBe('late_cancelled');
  });
});

describe('upgradeCharge', () => {
  it('prorates upgrades by days left and makes downgrades free', () => {
    expect(upgradeCharge(basic, premium, sub, NOW)).toBe(387000);
    expect(upgradeCharge(premium, basic, sub, NOW)).toBe(0);
  });
});
