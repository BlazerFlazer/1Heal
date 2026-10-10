import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import type { ReactElement } from 'react';

import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { useMembershipStore } from '@/services/membership/membershipStore';
import { i18n } from '@/shared/i18n';
import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { ToastProvider } from '@/shared/ui/Toast';

import { VenueScreen } from './VenueScreen';

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
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
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

const PULSE_ID = 'aebd4df0-457a-56c4-ba15-e4dfb1231ab4';
const ATLAS_PREMIUM_ID = '32792d45-a7ba-5082-8d1f-fcb63627ed60';

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

function withProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider scheme="light">
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const timetableSettled = () =>
  waitFor(() => expect(screen.queryByTestId('venue-sessions-skeleton')).toBeNull());

describe('VenueScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest
      .mocked(Network.useNetworkState)
      .mockReturnValue({ isConnected: true, isInternetReachable: true });
    useAuthStore.setState({ status: 'signedIn', session, activeMode: 'member' });
    useMembershipStore.getState().reset('u1');
    useMembershipStore.getState().purchase('u1', 'standard', 'payme');
  });

  it('renders the venue and books a drop-in visit through the confirm sheet', async () => {
    await render(withProviders(<VenueScreen id={PULSE_ID} />));
    expect(
      await screen.findByRole('header', { name: 'Pulse Fitness Yunusabad' }),
    ).toBeOnTheScreen();
    await timetableSettled();
    expect(screen.getByText('Included in Standard and above')).toBeOnTheScreen();
    expect(screen.getByText('Drop-in visit')).toBeOnTheScreen();
    expect(screen.getByText('Opening hours')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('venue-dropin-book'));
    expect(screen.getByText('Confirm your booking')).toBeOnTheScreen();
    expect(screen.getByText('One visit will be used: 15 of 16 left')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirm booking' }));
    expect(screen.getByText('You’re booked!')).toBeOnTheScreen();
    expect(haptics.success).toHaveBeenCalled();
    expect(useMembershipStore.getState().byUser.u1?.bookings).toHaveLength(1);
  });

  it('explains a tier the plan does not include', async () => {
    await render(withProviders(<VenueScreen id={ATLAS_PREMIUM_ID} />));
    expect(await screen.findByText('Premium plan only')).toBeOnTheScreen();
    await timetableSettled();

    await fireEvent.press(screen.getByTestId('venue-dropin-book'));
    expect(
      screen.getByText('Available from the Premium plan. Upgrade to visit this venue.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Upgrade plan' })).toBeOnTheScreen();
  });

  it('shows not found for an unknown id', async () => {
    await render(withProviders(<VenueScreen id="no-such-venue" />));
    expect(screen.getByText('Venue not found')).toBeOnTheScreen();
  });
});
