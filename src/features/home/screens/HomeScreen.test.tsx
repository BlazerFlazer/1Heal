import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { HomeScreen } from './HomeScreen';
import { NearbySection } from '../components/NearbySection';

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

const useNetworkState = jest.mocked(Network.useNetworkState);
const OFFLINE = 'No connection. Showing saved data.';

const memberSession: Session = {
  userId: 'u1',
  phoneE164: '+998901234567',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '2030-01-01T00:00:00.000Z',
  roles: ['member'],
  deviceId: 'device-1',
  profile: { fullName: 'Aziza Karimova' },
};

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

function tree(scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <HomeScreen />
    </ThemeProvider>
  );
}

describe('HomeScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    setOnline(true);
    useAuthStore.setState({ status: 'signedIn', session: memberSession, activeMode: 'member' });
  });

  it('greets by first name and shows the subscription and nearby placeholders', async () => {
    await render(tree());
    expect(
      screen.getByRole('header', { name: /^Good (morning|afternoon|evening|night), Aziza$/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Your subscription' })).toBeOnTheScreen();
    expect(screen.getByText('No subscription yet')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Nearby venues' })).toBeOnTheScreen();
    expect(screen.getByText('Venues will appear here')).toBeOnTheScreen();
  });

  it('greets neutrally when the profile has no name', async () => {
    useAuthStore.setState({ session: { ...memberSession, profile: {} } });
    await render(tree());
    expect(
      screen.getByRole('header', { name: /^Good (morning|afternoon|evening|night)$/ }),
    ).toBeOnTheScreen();
  });

  it('routes the calls to action to plans and to the catalogue', async () => {
    await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: 'See plans' }));
    expect(router.push).toHaveBeenLastCalledWith('/(member)/subscription/plans');

    await fireEvent.press(screen.getByRole('button', { name: 'Open the catalogue' }));
    expect(router.push).toHaveBeenLastCalledWith('/(member)/(tabs)/discover');

    await fireEvent.press(screen.getByRole('button', { name: 'See all' }));
    expect(router.push).toHaveBeenCalledTimes(3);
  });

  it('shows the offline banner only while offline', async () => {
    await render(tree());
    expect(screen.queryByText(OFFLINE)).toBeNull();

    setOnline(false);
    await screen.rerender(tree());
    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
  });

  it.each<ColorScheme>(['light', 'dark'])('paints the %s background', async (scheme) => {
    await render(tree(scheme));
    expect(StyleSheet.flatten(screen.getByTestId('home').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
  });
});

describe('NearbySection', () => {
  it('shows skeleton rows while loading', async () => {
    await render(
      <ThemeProvider>
        <NearbySection status="loading" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('home-nearby-skeleton')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(screen.queryByText('Venues will appear here')).toBeNull();
  });
});
