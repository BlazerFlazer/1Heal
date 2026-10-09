import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import type { AuthService, AuthStateListener } from '@/services/auth';
import { ThemeProvider } from '@/shared/theme';
import type { ColorScheme } from '@/shared/theme/tokens';
import { ToastProvider } from '@/shared/ui/Toast';

/**
 * Test helpers for the auth feature. Each test file still declares its own `jest.mock` calls
 * (safe area, gesture handler, lucide, expo-network, expo-router, `@/services/auth`).
 */

export const TOAST_HOST_TEST_ID = 'toast';

export type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  scheme?: ColorScheme;
  client?: QueryClient;
};

/** No retries and no GC timers, so nothing outlives a test (mutation GC is a 5-minute timeout). */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

/** Renders inside the providers every auth screen needs: query, theme and toasts. */
export function renderWithProviders(
  ui: ReactElement,
  {
    scheme = 'light',
    client = createTestQueryClient(),
    ...options
  }: RenderWithProvidersOptions = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ThemeProvider scheme={scheme}>
        <ToastProvider testID={TOAST_HOST_TEST_ID}>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}

/** An `AuthService` whose every method is a `jest.fn`; tests set return values per case. */
export function createAuthServiceMock(): jest.Mocked<AuthService> {
  return {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    restoreSession: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn((_listener: AuthStateListener) => () => undefined),
  };
}
