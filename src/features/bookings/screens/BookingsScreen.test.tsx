import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { themeColors } from '@/shared/theme/tokens';

import { BookingsScreen } from './BookingsScreen';
import { makeBooking, seedMembership, withProviders } from '../__fixtures__/bookingsFixtures';

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

describe('BookingsScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest
      .mocked(Network.useNetworkState)
      .mockReturnValue({ isConnected: true, isInternetReachable: true });
  });

  it('lists a seeded upcoming booking with the visits summary and opens its detail', async () => {
    const booking = makeBooking();
    seedMembership([booking], 'basic');
    await render(withProviders(<BookingsScreen />));

    expect(screen.getByRole('header', { name: 'My bookings' })).toBeOnTheScreen();
    expect(await screen.findByTestId(`booking-card-${booking.id}`)).toBeOnTheScreen();
    expect(screen.getByText('7 of 8 left')).toBeOnTheScreen();
    expect(screen.getByText('Confirmed')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId(`booking-card-${booking.id}`));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/booking/[id]',
      params: { id: booking.id },
    });
  });

  it('shows cancelled bookings under History', async () => {
    seedMembership([makeBooking({ id: 'bk_cancelled', status: 'cancelled' })]);
    await render(withProviders(<BookingsScreen />));

    expect(await screen.findByText('Find a session')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'History' }));
    expect(screen.getByTestId('booking-card-bk_cancelled')).toBeOnTheScreen();
    expect(screen.getByText('Cancelled')).toBeOnTheScreen();
  });

  it('promotes plans when there is no subscription', async () => {
    seedMembership([], null);
    await render(withProviders(<BookingsScreen />, 'dark'));

    expect(await screen.findByText('Choose a plan')).toBeOnTheScreen();
    expect(screen.queryByTestId('bookings-visits')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('bookings').props.style).backgroundColor).toBe(
      themeColors.dark.background,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Choose a plan' }));
    expect(router.push).toHaveBeenCalledWith('/subscription/plans');
  });
});
