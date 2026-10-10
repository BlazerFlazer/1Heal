import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { useAuthBootstrap, type AuthStatus } from '@/services/auth/authStore';
import { useOnboardingStore } from '@/services/session/onboardingStore';
import { initI18n } from '@/shared/i18n';
import { useAppFonts, useThemeStore } from '@/shared/theme';

import { useFeatureFlagSync } from './useFeatureFlagSync';

export type BootstrapParts = {
  fontsLoaded: boolean;
  fontError: Error | null;
  status: AuthStatus;
  onboardingHydrated: boolean;
  themeHydrated: boolean;
  localeReady: boolean;
};

export type AppBootstrap = { ready: boolean };

/**
 * The splash screen stays up until every gate opens. A font failure still opens the gate:
 * the system font is better than a splash screen that never goes away.
 */
export function isBootstrapReady(parts: BootstrapParts): boolean {
  const fontsSettled = parts.fontsLoaded || parts.fontError !== null;
  return (
    fontsSettled &&
    parts.status !== 'bootstrapping' &&
    parts.onboardingHydrated &&
    parts.themeHydrated &&
    parts.localeReady
  );
}

/**
 * Mount once in the root layout. Loads fonts, restores the session, waits for the persisted
 * stores and the saved language, then hides the native splash screen. Remote feature flags load
 * after sign-in and never hold the splash screen (the local defaults apply meanwhile).
 */
export function useAppBootstrap(): AppBootstrap {
  const [fontsLoaded, fontError] = useAppFonts();
  const status = useAuthBootstrap();
  useFeatureFlagSync(status);
  const onboardingHydrated = useOnboardingStore((state) => state.hydrated);
  const themeHydrated = useThemeStore((state) => state.hydrated);
  const [localeReady, setLocaleReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initI18n().finally(() => {
      if (active) setLocaleReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const ready = isBootstrapReady({
    fontsLoaded,
    fontError,
    status,
    onboardingHydrated,
    themeHydrated,
    localeReady,
  });

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return { ready };
}
