import type { BookingRecord } from '@/domain/membership';

import { countdown, nextConfirmedBooking } from './upcoming';

const MIN = 60_000;
const booking = (id: string, startsAt: number, status: BookingRecord['status']): BookingRecord => ({
  id,
  venueId: 'v',
  sessionId: null,
  startsAt,
  endsAt: startsAt + 60 * MIN,
  status,
  createdAt: 0,
});

describe('upcoming', () => {
  it('picks the earliest confirmed booking that has not finished', () => {
    const now = 1_000 * MIN;
    const list = [
      booking('later', now + 300 * MIN, 'confirmed'),
      booking('cancelled', now + 10 * MIN, 'cancelled'),
      booking('finished', now - 120 * MIN, 'confirmed'),
      booking('soon', now + 30 * MIN, 'confirmed'),
    ];
    expect(nextConfirmedBooking(list, now)?.id).toBe('soon');
    expect(nextConfirmedBooking([], now)).toBeUndefined();
  });

  it('counts down in minutes, then hours, and stops beyond 12 h or once started', () => {
    expect(countdown(35 * MIN, 0)).toEqual({ key: 'inMinutes', count: 35 });
    expect(countdown(125 * MIN, 0)).toEqual({ key: 'inHours', count: 2 });
    expect(countdown(13 * 60 * MIN, 0)).toBeNull();
    expect(countdown(0, MIN)).toBeNull();
  });
});
