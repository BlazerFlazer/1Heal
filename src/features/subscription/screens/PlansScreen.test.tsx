import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { i18n } from '@/shared/i18n';

import { PlansScreen } from './PlansScreen';
import { renderScreen, signInMember } from '../testUtils';

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
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined), light: jest.fn(async () => undefined) },
}));
jest.mock('@/services/auth', () => ({ getAuthService: jest.fn() }));

describe('PlansScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    signInMember();
  });

  it('renders the three plans and opens checkout for the chosen one', async () => {
    await renderScreen(<PlansScreen />);
    expect(screen.getByText('One subscription, dozens of places')).toBeOnTheScreen();

    expect(await screen.findByTestId('plan-basic')).toBeOnTheScreen();
    expect(screen.getByTestId('plan-standard')).toBeOnTheScreen();
    expect(screen.getByTestId('plan-premium')).toBeOnTheScreen();
    expect(screen.getByText('Popular')).toBeOnTheScreen();
    expect(screen.getByText('Unlimited visits')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Subscribe to Standard' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/subscription/checkout',
      params: { plan: 'standard' },
    });
  });
});
