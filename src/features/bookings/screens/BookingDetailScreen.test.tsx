import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { useMembershipStore } from '@/services/membership/membershipStore';
import { i18n } from '@/shared/i18n';

import { BookingDetailScreen } from './BookingDetailScreen';
import {
  makeBooking,
  seedMembership,
  TEST_USER,
  venueWithClass,
  withProviders,
} from '../__fixtures__/bookingsFixtures';

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

describe('BookingDetailScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest
      .mocked(Network.useNetworkState)
      .mockReturnValue({ isConnected: true, isInternetReachable: true });
  });

  it('shows the booking and cancels it for free after confirmation', async () => {
    const booking = makeBooking();
    const { venue, template } = venueWithClass();
    seedMembership([booking]);
    await render(withProviders(<BookingDetailScreen id={booking.id} />));

    expect(await screen.findByRole('header', { name: venue.name.en })).toBeOnTheScreen();
    expect(screen.getByText(template.name.en)).toBeOnTheScreen();
    expect(screen.getByTestId('booking-cancel-preview')).toHaveTextContent(
      /^Free cancellation until/,
    );

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Directions' }));
    expect(openURL).toHaveBeenCalledWith(
      `https://yandex.uz/maps/?pt=${venue.lng},${venue.lat}&z=17&l=map`,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel booking' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Yes, cancel' }));

    await waitFor(() =>
      expect(useMembershipStore.getState().byUser[TEST_USER]?.bookings[0]?.status).toBe(
        'cancelled',
      ),
    );
    expect(await screen.findByText('Booking cancelled, visit returned')).toBeOnTheScreen();
  });

  it('shows a not-found state for an unknown id', async () => {
    seedMembership([]);
    await render(withProviders(<BookingDetailScreen id="missing" />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Back to my bookings' }));
    expect(router.replace).toHaveBeenCalledWith('/bookings');
  });
});
