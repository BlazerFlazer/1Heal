import type { ReactNativeOptions } from '@sentry/react-native';

import type { AppEnv, AppEnvName } from '@/shared/config/env';

import { scrubBreadcrumb, scrubEvent } from './scrub';

/** Sentry environment names; dev/staging/production share one project per app (ADR-022). */
export const SENTRY_ENVIRONMENTS: Record<AppEnvName, string> = {
  dev: 'development',
  staging: 'staging',
  production: 'production',
};

/** Transaction sample rates: everything locally, a representative slice in production. */
export const TRACES_SAMPLE_RATES: Record<AppEnvName, number> = {
  dev: 1,
  staging: 0.5,
  production: 0.2,
};

type SentryEnv = Pick<AppEnv, 'APP_ENV' | 'SENTRY_ENABLED' | 'SENTRY_DSN' | 'SUPABASE_URL'>;

export function isSentryEnabled(env: SentryEnv): boolean {
  return env.SENTRY_ENABLED && env.SENTRY_DSN !== undefined;
}

/**
 * Trace headers go only to our own backend. The SDK default (`/.*\/`) would attach them to
 * every third-party request, including map tiles and payment providers.
 */
export function tracePropagationTargets(supabaseUrl: string | undefined): (string | RegExp)[] {
  if (supabaseUrl === undefined) return [/^\//];
  const origin = new URL(supabaseUrl).origin;
  // The origin must end at a path, query or the string end: `abc.supabase.co.evil.com` must miss.
  return [new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?:[/?#]|$)`)];
}

/**
 * Pure option builder so the configuration is unit-tested without the native SDK.
 * Integrations are passed in because they are created by the SDK at runtime.
 */
export function buildSentryOptions(
  env: SentryEnv,
  integrations: NonNullable<ReactNativeOptions['integrations']>,
): ReactNativeOptions {
  return {
    dsn: env.SENTRY_DSN,
    enabled: isSentryEnabled(env),
    environment: SENTRY_ENVIRONMENTS[env.APP_ENV],
    // Privacy-first (COMPLIANCE §8): no IP address, cookies or request bodies.
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: TRACES_SAMPLE_RATES[env.APP_ENV],
    tracePropagationTargets: tracePropagationTargets(env.SUPABASE_URL),
    // Replays only for sessions that hit an error, fully masked.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
    debug: false,
  };
}
