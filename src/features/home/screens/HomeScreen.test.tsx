import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';

import { DAY_MS } from '@/domain/membership';
import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { useMembershipStore } from '@/services/membership/membershipStore';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';

import { HomeScreen } from './HomeScreen';

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

function tree() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider scheme="light">
        <HomeScreen />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('HomeScreen', () => {
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

  it('greets the member and promotes plans when there is no subscription', async () => {
    await render(tree());
    expect(
      screen.getByRole('header', { name: /^Good (morning|afternoon|evening|night), Aziza$/ }),
    ).toBeOnTheScreen();
    expect(await screen.findByText('One membership — 30 places in Tashkent')).toBeOnTheScreen();
    expect(await screen.findByText(/^from 199 000/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Choose a plan' }));
    expect(router.push).toHaveBeenLastCalledWith('/subscription/plans');

    await fireEvent.press(await screen.findByRole('button', { name: 'Category: Gyms' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/discover',
      params: { category: 'gym' },
    });
  });

  it('shows the plan and the visits ring for an active subscription', async () => {
    const now = Date.now();
    useMembershipStore.setState({
      byUser: {
        u1: {
          subscription: {
            planCode: 'standard',
            status: 'active',
            periodStart: now - DAY_MS,
            periodEnd: now + 29 * DAY_MS,
            autoRenew: true,
          },
          bookings: [],
          payments: [],
        },
      },
    });
    await render(tree());
    expect(screen.getByText('Standard')).toBeOnTheScreen();
    expect(screen.getByLabelText('16 of 16 visits left')).toBeOnTheScreen();
    expect(screen.queryByTestId('home-promo')).toBeNull();
    expect(await screen.findByText('Included in your plan')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('link', { name: 'Manage subscription' }));
    expect(router.push).toHaveBeenLastCalledWith('/subscription');
  });
});
