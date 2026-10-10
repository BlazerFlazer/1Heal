import type { ErrorEvent } from '@sentry/react-native';

import type { AppEnv } from '@/shared/config/env';

import { REDACTED } from './scrub';
import {
  buildSentryOptions,
  isSentryEnabled,
  SENTRY_ENVIRONMENTS,
  tracePropagationTargets,
  TRACES_SAMPLE_RATES,
} from './sentryOptions';

type SentryEnv = Pick<AppEnv, 'APP_ENV' | 'SENTRY_ENABLED' | 'SENTRY_DSN' | 'SUPABASE_URL'>;

const DSN = 'https://key@o1.ingest.de.sentry.io/2';

function envWith(overrides: Partial<SentryEnv> = {}): SentryEnv {
  return {
    APP_ENV: 'production',
    SENTRY_ENABLED: true,
    SENTRY_DSN: DSN,
    SUPABASE_URL: 'https://abc.supabase.co',
    ...overrides,
  };
}

describe('isSentryEnabled', () => {
  it('needs both the flag and a DSN', () => {
    expect(isSentryEnabled(envWith())).toBe(true);
    expect(isSentryEnabled(envWith({ SENTRY_ENABLED: false }))).toBe(false);
    expect(isSentryEnabled(envWith({ SENTRY_DSN: undefined }))).toBe(false);
  });
});

describe('tracePropagationTargets', () => {
  it('limits trace headers to the backend origin', () => {
    const [target] = tracePropagationTargets('https://abc.supabase.co/rest/v1');
    expect(target).toBeInstanceOf(RegExp);
    const regex = target as RegExp;
    expect(regex.test('https://abc.supabase.co/rest/v1/venues')).toBe(true);
    expect(regex.test('https://abc.supabase.co.evil.com/')).toBe(false);
    expect(regex.test('https://tiles.maps.example/1/2/3.png')).toBe(false);
  });

  it('falls back to same-origin relative URLs without a backend', () => {
    const [target] = tracePropagationTargets(undefined);
    expect((target as RegExp).test('/api/x')).toBe(true);
    expect((target as RegExp).test('https://other.example/')).toBe(false);
  });
});

describe('buildSentryOptions', () => {
  it.each(['dev', 'staging', 'production'] as const)('maps the %s environment', (appEnv) => {
    const options = buildSentryOptions(envWith({ APP_ENV: appEnv }), []);
    expect(options.environment).toBe(SENTRY_ENVIRONMENTS[appEnv]);
    expect(options.tracesSampleRate).toBe(TRACES_SAMPLE_RATES[appEnv]);
  });

  it('is privacy-first', () => {
    const options = buildSentryOptions(envWith(), []);
    expect(options.sendDefaultPii).toBe(false);
    expect(options.attachScreenshot).toBe(false);
    expect(options.replaysSessionSampleRate).toBe(0);
    expect(options.replaysOnErrorSampleRate).toBe(1);
    expect(options.debug).toBe(false);
  });

  it('disables the SDK when the flag is off', () => {
    expect(buildSentryOptions(envWith({ SENTRY_ENABLED: false }), []).enabled).toBe(false);
  });

  it('scrubs events before they are sent', () => {
    const options = buildSentryOptions(envWith(), []);
    const event: ErrorEvent = { type: undefined, message: 'otp for +998 90 123 45 67' };
    const sent = options.beforeSend?.(event, {});
    expect(sent).toEqual({ type: undefined, message: `otp for ${REDACTED}` });
  });
});
