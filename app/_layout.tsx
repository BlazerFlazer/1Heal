import '@/shared/i18n/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

import {
  AppProviders,
  resolveShellGuards,
  ThemedStatusBar,
  useAppBootstrap,
  useShellState,
} from '@/shared/providers';
import { useTheme } from '@/shared/theme';

// Module scope, not awaited: the native splash stays up until `useAppBootstrap` is ready.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export { RootErrorBoundary as ErrorBoundary } from '@/shared/providers';

/**
 * `initialRouteName="index"` makes the unprotected `index` route the anchor: when a guard closes,
 * React Navigation falls back to it (otherwise to the first declared screen) and it redirects.
 */
function RootNavigator() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const guards = resolveShellGuards(useShellState());

  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={guards.public}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={guards.member}>
        <Stack.Screen name="(member)" />
      </Stack.Protected>
      <Stack.Protected guard={guards.partner}>
        <Stack.Screen name="(partner)" />
      </Stack.Protected>
      {__DEV__ ? (
        <Stack.Screen
          name="dev/gallery"
          options={{
            headerShown: true,
            title: t('ui.gallery.title'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontFamily: typography.subtitle.fontFamily },
          }}
        />
      ) : null}
    </Stack>
  );
}

export default function RootLayout() {
  const { ready } = useAppBootstrap();
  if (!ready) return null;
  return (
    <AppProviders>
      <ThemedStatusBar />
      <RootNavigator />
    </AppProviders>
  );
}
