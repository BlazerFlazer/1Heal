import { fireEvent, screen } from '@testing-library/react-native';

import { DAY_MS, PERIOD_DAYS } from '@/domain/membership';
import { useMembershipStore } from '@/services/membership/membershipStore';
import { i18n } from '@/shared/i18n';

import { ManageScreen } from './ManageScreen';
import { MEMBER_ID, renderScreen, signInMember } from '../testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined), light: jest.fn(async () => undefined) },
}));
jest.mock('@/services/auth', () => ({ getAuthService: jest.fn() }));

function seedSubscription() {
  const now = Date.now();
  useMembershipStore.setState({
    byUser: {
      [MEMBER_ID]: {
        subscription: {
          planCode: 'standard',
          status: 'active',
          periodStart: now - DAY_MS,
          periodEnd: now + (PERIOD_DAYS - 1) * DAY_MS,
          autoRenew: true,
        },
        bookings: [
          {
            id: 'bk1',
            venueId: 'v1',
            sessionId: null,
            startsAt: now + DAY_MS,
            endsAt: now + DAY_MS + 3_600_000,
            status: 'confirmed',
            createdAt: now,
          },
        ],
        payments: [
          {
            id: 'pay1',
            planCode: 'standard',
            amountUzs: 349_000,
            provider: 'payme',
            kind: 'subscription',
            paidAt: now - DAY_MS,
          },
        ],
      },
    },
  });
}

describe('ManageScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    signInMember();
  });

  it('invites to pick a plan without a subscription', async () => {
    await renderScreen(<ManageScreen />);
    expect(screen.getByText(/subscription yet/)).toBeOnTheScreen();
  });

  it('shows visits left and the receipt, and cancels after confirmation', async () => {
    seedSubscription();
    await renderScreen(<ManageScreen />);
    expect(screen.getByText('15 visits left')).toBeOnTheScreen();
    expect(screen.getByText('1 of 16 used')).toBeOnTheScreen();
    expect(screen.getByText('Standard subscription')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel subscription' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Yes, cancel' }));
    expect(useMembershipStore.getState().byUser[MEMBER_ID]?.subscription?.status).toBe('cancelled');
  });
});
