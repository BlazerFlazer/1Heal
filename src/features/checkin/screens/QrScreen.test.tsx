import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';

import { DAY_MS } from '@/domain/membership';
import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { useMembershipStore } from '@/services/membership/membershipStore';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';

import { memberShortId } from '../qrPattern';
import { QrScreen } from './QrScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    medium: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
    warning: jest.fn(async () => undefined),
    error: jest.fn(async () => undefined),
  },
}));
jest.mock('@/services/auth', () => ({ getAuthService: jest.fn() }));

const session: Session = {
  userId: 'u1',
  phoneE164: '+998901234567',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '2030-01-01T00:00:00.000Z',
  roles: ['member'],
  deviceId: 'device-1',
  profile: { fullName: 'Aziza Karimova' },
};

const tree = () => (
  <ThemeProvider>
    <QrScreen />
  </ThemeProvider>
);

describe('QrScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest
      .mocked(Network.useNetworkState)
      .mockReturnValue({ isConnected: true, isInternetReachable: true });
    useAuthStore.setState({ status: 'signedIn', session, activeMode: 'member' });
    useMembershipStore.setState({ byUser: {} });
  });

  it('points at plans without a subscription', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'My QR code' })).toBeOnTheScreen();
    expect(screen.queryByTestId('qr-pass')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a plan' }));
    expect(router.push).toHaveBeenCalledWith('/subscription/plans');
  });

  it('shows the member pass with the rotating code and the next booking', async () => {
    const now = Date.now();
    useMembershipStore.setState({
      byUser: {
        u1: {
          subscription: {
            planCode: 'basic',
            status: 'active',
            periodStart: now - DAY_MS,
            periodEnd: now + 29 * DAY_MS,
            autoRenew: true,
          },
          bookings: [
            {
              id: 'bk1',
              venueId: 'missing-venue',
              sessionId: null,
              startsAt: now + 2 * 60 * 60_000,
              endsAt: now + 3 * 60 * 60_000,
              status: 'confirmed',
              createdAt: now,
            },
          ],
          payments: [],
        },
      },
    });
    await render(tree());
    expect(screen.getByText('Basic')).toBeOnTheScreen();
    expect(screen.getByText(memberShortId('u1'))).toBeOnTheScreen();
    expect(screen.getByText('The code refreshes every minute')).toBeOnTheScreen();
    expect(screen.getByText('Visits: 7 of 8')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('qr-next-booking'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/booking/[id]', params: { id: 'bk1' } });
  });
});
