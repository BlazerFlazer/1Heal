import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '@/shared/theme';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Screen } from '@/shared/ui/Screen';

/**
 * Rendered by Expo Router in place of the root layout when a route throws. It brings its own
 * theme because the provider tree may be what failed; the safe area comes from Expo Router.
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[shell] unhandled render error', error);
  }, [error]);

  return (
    <ThemeProvider>
      <Screen contentStyle={styles.center} testID="root-error">
        <ErrorState
          variant="generic"
          onRetry={() => {
            void retry();
          }}
          testID="root-error-state"
        />
      </Screen>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
});
