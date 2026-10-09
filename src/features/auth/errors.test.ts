import { AuthError } from '@/services/auth/types';

import { shouldShowDevCodeHint } from './devHint';
import {
  authErrorCode,
  describeAuthError,
  isInlineAuthError,
  mapAuthError,
  retryAfterMinutes,
  retryAfterSec,
} from './errors';

describe('retryAfterMinutes', () => {
  it('rounds up and never reports less than a minute', () => {
    expect(retryAfterMinutes(0)).toBe(1);
    expect(retryAfterMinutes(30)).toBe(1);
    expect(retryAfterMinutes(61)).toBe(2);
    expect(retryAfterMinutes(600)).toBe(10);
    expect(retryAfterMinutes(undefined)).toBe(1);
  });
});

describe('mapAuthError', () => {
  it('maps every code to an errors.* key', () => {
    expect(mapAuthError('INVALID_PHONE')).toEqual({ key: 'errors.auth.invalidPhone' });
    expect(mapAuthError('INVALID_CODE')).toEqual({ key: 'errors.auth.invalidCode' });
    expect(mapAuthError('CODE_EXPIRED')).toEqual({ key: 'errors.auth.codeExpired' });
    expect(mapAuthError('LOCKED')).toEqual({ key: 'errors.auth.locked' });
    expect(mapAuthError('NETWORK')).toEqual({ key: 'errors.network' });
    expect(mapAuthError('UNKNOWN')).toEqual({ key: 'errors.unknown' });
  });

  it('attaches the wait in minutes to TOO_MANY_REQUESTS', () => {
    expect(mapAuthError('TOO_MANY_REQUESTS', 120)).toEqual({
      key: 'errors.auth.tooManyRequests',
      params: { minutes: 2 },
    });
    expect(mapAuthError('TOO_MANY_REQUESTS')).toEqual({
      key: 'errors.auth.tooManyRequests',
      params: { minutes: 1 },
    });
  });
});

describe('describeAuthError', () => {
  it('reads the code and retry-after off an AuthError', () => {
    expect(describeAuthError(new AuthError('TOO_MANY_REQUESTS', { retryAfterSec: 300 }))).toEqual({
      key: 'errors.auth.tooManyRequests',
      params: { minutes: 5 },
    });
    expect(authErrorCode(new AuthError('LOCKED'))).toBe('LOCKED');
    expect(retryAfterSec(new AuthError('LOCKED', { retryAfterSec: 900 }))).toBe(900);
  });

  it('treats anything else as unknown', () => {
    expect(describeAuthError(new Error('boom'))).toEqual({ key: 'errors.unknown' });
    expect(describeAuthError(undefined)).toEqual({ key: 'errors.unknown' });
    expect(authErrorCode('nope')).toBe('UNKNOWN');
    expect(retryAfterSec(new Error('boom'))).toBeUndefined();
  });
});

describe('isInlineAuthError', () => {
  it('keeps actionable codes under the field and sends the rest to a toast', () => {
    for (const code of [
      'INVALID_PHONE',
      'INVALID_CODE',
      'CODE_EXPIRED',
      'TOO_MANY_REQUESTS',
      'LOCKED',
    ] as const) {
      expect(isInlineAuthError(new AuthError(code))).toBe(true);
    }
    expect(isInlineAuthError(new AuthError('NETWORK'))).toBe(false);
    expect(isInlineAuthError(new AuthError('UNKNOWN'))).toBe(false);
    expect(isInlineAuthError(new Error('boom'))).toBe(false);
  });
});

describe('shouldShowDevCodeHint', () => {
  it('is true only for dev builds on the mock provider', () => {
    expect(shouldShowDevCodeHint({ isDev: true, authProvider: 'mock' })).toBe(true);
    expect(shouldShowDevCodeHint({ isDev: true, authProvider: 'supabase' })).toBe(false);
    expect(shouldShowDevCodeHint({ isDev: false, authProvider: 'mock' })).toBe(false);
    expect(shouldShowDevCodeHint({ isDev: false, authProvider: 'supabase' })).toBe(false);
  });
});
