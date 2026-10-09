import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { Linking, StyleSheet } from 'react-native';

import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { SUPPORT_EMAIL } from '@/shared/config/brand';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { ProfileScreen } from './ProfileScreen';

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
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));
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
jest.mock('@/services/auth', () => {
  const signOut = jest.fn(async () => undefined);
  return { getAuthService: () => ({ signOut }) };
});

const useNetworkState = jest.mocked(Network.useNetworkState);
const signOut = jest.mocked(getAuthService().signOut);
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
      <ProfileScreen />
    </ThemeProvider>
  );
}

describe('ProfileScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(router.push).mockClear();
    signOut.mockClear();
    setOnline(true);
    useThemeStore.setState({ preference: 'system', hydrated: true });
    useAuthStore.setState({ status: 'signedIn', session: memberSession, activeMode: 'member' });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the identity, the menu rows and the app version', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'Aziza Karimova' })).toBeOnTheScreen();
    expect(screen.getByText('+998 90 123 45 67')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avatar of Aziza Karimova')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Language, English' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Theme, System' })).toBeOnTheScreen();
    expect(screen.getAllByText('Soon')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Partner mode' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Component gallery' })).toBeOnTheScreen();
    expect(screen.getByText('Version 1.2.3')).toBeOnTheScreen();
  });

  it('falls back to a neutral display name', async () => {
    useAuthStore.setState({ session: { ...memberSession, profile: {} } });
    await render(tree());
    expect(screen.getByRole('header', { name: 'Member' })).toBeOnTheScreen();
  });

  it('switches the language from the sheet', async () => {
    await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: 'Language, English' }));
    expect(screen.getByTestId('profile-language-sheet-panel')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Oʻzbekcha' }));
    try {
      await waitFor(() => expect(i18n.language).toBe('uz'));
      expect(screen.getByRole('header', { name: 'Sozlamalar' })).toBeOnTheScreen();
    } finally {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });

  it('switches the theme preference from the sheet', async () => {
    await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: 'Theme, System' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    expect(useThemeStore.getState().preference).toBe('dark');
    expect(screen.getByRole('button', { name: 'Theme, Dark' })).toBeOnTheScreen();
  });

  it('opens a legal document from the sheet', async () => {
    await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: 'Legal' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Terms of Service' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(member)/legal/[doc]',
      params: { doc: 'terms' },
    });
  });

  it('opens the support mail client and the component gallery', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: 'Support' }));
    expect(openURL).toHaveBeenCalledWith(`mailto:${SUPPORT_EMAIL}`);

    await fireEvent.press(screen.getByRole('button', { name: 'Component gallery' }));
    expect(router.push).toHaveBeenCalledWith('/dev/gallery');
    openURL.mockRestore();
  });

  it('offers partner mode only to partners and switches the active mode', async () => {
    useAuthStore.setState({ session: { ...memberSession, roles: ['member', 'partner'] } });
    await render(tree());
    await fireEvent.press(screen.getByRole('button', { name: 'Partner mode' }));
    expect(useAuthStore.getState().activeMode).toBe('partner');
  });

  it('signs out after confirmation', async () => {
    await render(tree());
    await fireEvent.press(screen.getByTestId('profile-sign-out'));
    expect(screen.getByRole('header', { name: 'Sign out?' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('profile-sign-out-sheet-confirm'));
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session).toBeNull();
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
    expect(StyleSheet.flatten(screen.getByTestId('profile').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
  });
});
