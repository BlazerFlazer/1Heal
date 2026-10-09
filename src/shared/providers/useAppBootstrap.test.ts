import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { useAuthStore } from '@/services/auth/authStore';
import { useOnboardingStore } from '@/services/session/onboardingStore';
import * as fonts from '@/shared/theme/fonts';
import { useThemeStore } from '@/shared/theme/themeStore';

import { isBootstrapReady, useAppBootstrap, type BootstrapParts } from './useAppBootstrap';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-splash-screen', () => ({ hide: jest.fn(), preventAutoHideAsync: jest.fn() }));
jest.mock('@/shared/theme/fonts', () => ({ useAppFonts: jest.fn(() => [true, null]) }));
jest.mock('@/services/auth', () => ({
  getAuthService: () => ({
    restoreSession: () => Promise.resolve(null),
    onAuthStateChange: () => () => undefined,
  }),
}));

const useAppFonts = jest.mocked(fonts.useAppFonts);
const hide = jest.mocked(SplashScreen.hide);

const ready: BootstrapParts = {
  fontsLoaded: true,
  fontError: null,
  status: 'signedOut',
  onboardingHydrated: true,
  themeHydrated: true,
  localeReady: true,
};

describe('isBootstrapReady', () => {
  it('is ready only when every gate is open', () => {
    expect(isBootstrapReady(ready)).toBe(true);
    expect(isBootstrapReady({ ...ready, status: 'bootstrapping' })).toBe(false);
    expect(isBootstrapReady({ ...ready, onboardingHydrated: false })).toBe(false);
    expect(isBootstrapReady({ ...ready, themeHydrated: false })).toBe(false);
    expect(isBootstrapReady({ ...ready, localeReady: false })).toBe(false);
    expect(isBootstrapReady({ ...ready, fontsLoaded: false })).toBe(false);
  });

  it('does not hold the splash screen hostage when fonts fail', () => {
    expect(isBootstrapReady({ ...ready, fontsLoaded: false, fontError: new Error('404') })).toBe(
      true,
    );
  });
});

describe('useAppBootstrap', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    hide.mockClear();
    useAppFonts.mockReturnValue([true, null]);
    useAuthStore.setState({ status: 'bootstrapping', session: null, activeMode: 'member' });
    useOnboardingStore.setState({ hydrated: true });
    useThemeStore.setState({ hydrated: true });
  });

  it('hides the splash screen once the session is restored and the locale applied', async () => {
    const { result } = await renderHook(() => useAppBootstrap());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('keeps the splash screen while a persisted store is still hydrating', async () => {
    useThemeStore.setState({ hydrated: false });
    const { result } = await renderHook(() => useAppBootstrap());
    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedOut'));
    expect(result.current.ready).toBe(false);
    expect(hide).not.toHaveBeenCalled();

    await act(async () => {
      useThemeStore.setState({ hydrated: true });
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
