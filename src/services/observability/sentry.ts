import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import type { ComponentType } from 'react';

import { env } from '@/shared/config/env';

import { buildSentryOptions, isSentryEnabled } from './sentryOptions';

let initialised = false;

/**
 * Starts the Sentry SDK when `EXPO_PUBLIC_SENTRY_ENABLED=true` and a DSN is configured.
 * Call once at module scope of the root layout, before any component renders.
 */
export function initObservability(): void {
  if (initialised || !isSentryEnabled(env)) return;
  initialised = true;
  const native = !isRunningInExpoGo();
  Sentry.init({
    ...buildSentryOptions(env, [
      Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: native }),
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: true,
        maskAllVectors: true,
      }),
    ]),
    enableNativeFramesTracking: native,
  });
}

export function isObservabilityActive(): boolean {
  return initialised;
}

/** Wraps the root component (touch breadcrumbs, render profiling) when Sentry is on. */
export function wrapRoot<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return isSentryEnabled(env) ? Sentry.wrap(Component) : Component;
}

/** Wraps an Expo Router `ErrorBoundary` so render errors reach Sentry with route context. */
export function wrapErrorBoundary<P extends { error: Error; retry: () => Promise<void> }>(
  Boundary: ComponentType<P>,
): ComponentType<P> {
  return isSentryEnabled(env) ? Sentry.wrapExpoRouterErrorBoundary(Boundary) : Boundary;
}

/** Reports a handled error. A no-op while Sentry is disabled. */
export function captureError(error: unknown, tags?: Record<string, string>): void {
  if (!initialised) return;
  Sentry.captureException(error, tags ? { tags } : undefined);
}

/** Identifies the user by internal UUID only (never phone or name) and tags the app mode. */
export function setObservabilityUser(userId: string | null, mode: 'member' | 'partner'): void {
  if (!initialised) return;
  Sentry.setUser(userId === null ? null : { id: userId });
  Sentry.setTag('app_mode', mode);
}
