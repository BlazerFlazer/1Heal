import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { StyleSheet } from 'react-native';

import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { PartnerSettingsScreen } from './PartnerSettingsScreen';

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
jest.mock('@/services/auth', () => {
  const signOut = jest.fn(async () => undefined);
  return { getAuthService: () => ({ signOut }) };
});

const useNetworkState = jest.mocked(Network.useNetworkState);
const signOut = jest.mocked(getAuthService().signOut);
const OFFLINE = 'No connection. Showing saved data.';

const partnerSession: Session = {
  userId: 'u1',
  phoneE164: '+998901234500',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '2030-01-01T00:00:00.000Z',
  roles: ['member', 'partner'],
  deviceId: 'device-1',
  profile: { fullName: 'Olim Abdullaev' },
};

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

function tree(scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <PartnerSettingsScreen />
    </ThemeProvider>
  );
}

describe('PartnerSettingsScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    signOut.mockClear();
    setOnline(true);
    useAuthStore.setState({ status: 'signedIn', session: partnerSession, activeMode: 'partner' });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('switches back to member mode', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Member mode' }));
    expect(useAuthStore.getState().activeMode).toBe('member');
  });

  it('signs out after confirmation and can be cancelled', async () => {
    await render(tree());
    await fireEvent.press(screen.getByTestId('partner-sign-out'));
    expect(screen.getByRole('header', { name: 'Sign out?' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('partner-sign-out-cancel'));
    expect(signOut).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('signedIn');

    await fireEvent.press(screen.getByTestId('partner-sign-out'));
    await fireEvent.press(screen.getByTestId('partner-sign-out-confirm'));
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
    expect(signOut).toHaveBeenCalledTimes(1);
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
    expect(
      StyleSheet.flatten(screen.getByTestId('partner-settings').props.style).backgroundColor,
    ).toBe(themeColors[scheme].background);
  });
});
