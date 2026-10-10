import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useMembershipStore } from '@/services/membership/membershipStore';
import { i18n } from '@/shared/i18n';

import { CheckoutScreen } from './CheckoutScreen';
import { PROCESSING_MS } from '../planHelpers';
import { MEMBER_ID, renderScreen, signInMember } from '../testUtils';

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
jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({ plan: 'standard' })),
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
  },
}));
jest.mock('@/services/auth', () => ({ getAuthService: jest.fn() }));

describe('CheckoutScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    signInMember();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pays with the chosen provider, then activates the subscription', async () => {
    await renderScreen(<CheckoutScreen />);
    expect(screen.getByText('Standard')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Click' }));
    await fireEvent.press(screen.getByTestId('checkout-pay'));
    expect(screen.getByText('Waiting for confirmation from Click…')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(PROCESSING_MS);
    });

    const membership = useMembershipStore.getState().byUser[MEMBER_ID];
    expect(membership?.subscription?.planCode).toBe('standard');
    expect(membership?.payments[0]).toMatchObject({ provider: 'click', kind: 'subscription' });
    expect(screen.getByText('Payment complete')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Find a venue' }));
    expect(router.replace).toHaveBeenCalledWith('/discover');
  });
});
