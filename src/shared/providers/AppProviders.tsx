import type { QueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryProvider } from '@/services/query/QueryProvider';
import { ThemeProvider, type ColorScheme } from '@/shared/theme';
import { ToastProvider } from '@/shared/ui/Toast';

import { WebFrame } from './WebFrame';

export type AppProvidersProps = {
  children: ReactNode;
  /** Forces a scheme (tests, previews); the app follows the user's preference. */
  scheme?: ColorScheme;
  /** Injected in tests; the app creates and persists its own client. */
  queryClient?: QueryClient;
  persister?: Persister;
};

/**
 * Provider stack for the whole app, outermost first: gestures, safe area, theme, the desktop web
 * phone frame (no-op on native), query cache, toasts. i18n needs no provider: the instance is initialised when `@/shared/i18n/i18n` is
 * imported by the root layout.
 */
export function AppProviders({ children, scheme, queryClient, persister }: AppProvidersProps) {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider scheme={scheme}>
          <WebFrame>
            <QueryProvider client={queryClient} persister={persister}>
              <ToastProvider testID="app-toasts">{children}</ToastProvider>
            </QueryProvider>
          </WebFrame>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
