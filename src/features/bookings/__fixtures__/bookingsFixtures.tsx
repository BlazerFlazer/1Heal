import type { ReactNode } from 'react';

import { DAY_MS, type BookingRecord } from '@/domain/membership';
import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { getClasses, searchVenues } from '@/services/demo/catalog';
import type { PlanCode } from '@/services/demo/types';
import { EMPTY_MEMBERSHIP, useMembershipStore } from '@/services/membership/membershipStore';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import type { ColorScheme } from '@/shared/theme/tokens';
import { ToastProvider } from '@/shared/ui/Toast';

/** Test-only fixtures for the bookings feature (imported by *.test.tsx files only). */
export const TEST_USER = 'u-bookings';

const session: Session = {
  userId: TEST_USER,
  phoneE164: '+998901234567',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '2030-01-01T00:00:00.000Z',
  roles: ['member'],
  deviceId: 'device-1',
  profile: { fullName: 'Aziza Karimova' },
};

/** A seeded venue that has at least one class template. */
export function venueWithClass() {
  const venue = searchVenues({}, 'en').find((v) => getClasses(v.id).length > 0);
  const template = venue ? getClasses(venue.id)[0] : undefined;
  if (!venue || !template) throw new Error('demo data has no venue with classes');
  return { venue, template };
}

export function makeBooking(overrides: Partial<BookingRecord> = {}): BookingRecord {
  const { venue, template } = venueWithClass();
  const startsAt = Date.now() + 2 * DAY_MS;
  return {
    id: 'bk_test_1',
    venueId: venue.id,
    sessionId: `${template.id}@${startsAt}`,
    startsAt,
    endsAt: startsAt + 60 * 60_000,
    status: 'confirmed',
    createdAt: Date.now(),
    ...overrides,
  };
}

/** Signs a fake member in and seeds their ledger directly in the zustand store. */
export function seedMembership(bookings: BookingRecord[], planCode: PlanCode | null = 'premium') {
  useAuthStore.setState({ status: 'signedIn', session, activeMode: 'member' });
  const now = Date.now();
  useMembershipStore.setState({
    byUser: {
      [TEST_USER]: {
        ...EMPTY_MEMBERSHIP,
        subscription: planCode
          ? {
              planCode,
              status: 'active',
              periodStart: now - DAY_MS,
              periodEnd: now + 29 * DAY_MS,
              autoRenew: true,
            }
          : null,
        bookings,
      },
    },
  });
}

export function withProviders(children: ReactNode, scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <ToastProvider testID="toasts">{children}</ToastProvider>
    </ThemeProvider>
  );
}
