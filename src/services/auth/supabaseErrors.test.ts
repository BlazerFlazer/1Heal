import { mapSupabaseAuthError, retryAfterFromMessage } from './supabaseErrors';
import { AuthError } from './types';

function supabaseError(fields: {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
}) {
  const error = new Error(fields.message ?? 'auth error') as Error & {
    code?: string;
    status?: number;
  };
  error.name = fields.name ?? 'AuthApiError';
  error.code = fields.code;
  error.status = fields.status;
  return error;
}

describe('retryAfterFromMessage', () => {
  it('extracts the cooldown Supabase puts in its message', () => {
    expect(
      retryAfterFromMessage('For security purposes, you can only request this after 42 seconds.'),
    ).toBe(42);
    expect(retryAfterFromMessage('Too many requests')).toBeUndefined();
  });
});

describe('mapSupabaseAuthError', () => {
  it('passes AuthError through untouched', () => {
    const original = new AuthError('LOCKED', { retryAfterSec: 5 });
    expect(mapSupabaseAuthError(original, 'verify')).toBe(original);
  });

  it.each([
    ['over_sms_send_rate_limit', undefined, 'TOO_MANY_REQUESTS'],
    ['over_request_rate_limit', 429, 'TOO_MANY_REQUESTS'],
    [undefined, 429, 'TOO_MANY_REQUESTS'],
    ['otp_expired', 403, 'CODE_EXPIRED'],
    ['user_banned', 403, 'LOCKED'],
    ['invalid_credentials', 400, 'INVALID_CODE'],
    ['unexpected_failure', 500, 'UNKNOWN'],
  ])('maps code %s / status %s to %s', (code, status, expected) => {
    expect(mapSupabaseAuthError(supabaseError({ code, status }), 'verify').code).toBe(expected);
  });

  it('reads validation_failed by phase', () => {
    const error = supabaseError({ code: 'validation_failed', status: 400 });
    expect(mapSupabaseAuthError(error, 'request').code).toBe('INVALID_PHONE');
    expect(mapSupabaseAuthError(error, 'verify').code).toBe('INVALID_CODE');
  });

  it('carries retryAfterSec for rate limits', () => {
    const mapped = mapSupabaseAuthError(
      supabaseError({
        code: 'over_sms_send_rate_limit',
        status: 429,
        message: 'you can only request this after 17 seconds.',
      }),
      'request',
    );
    expect(mapped.retryAfterSec).toBe(17);
    expect(mapped.cause).toBeInstanceOf(Error);
  });

  it('detects network failures', () => {
    expect(
      mapSupabaseAuthError(supabaseError({ name: 'AuthRetryableFetchError', status: 0 }), 'request')
        .code,
    ).toBe('NETWORK');
    expect(mapSupabaseAuthError(new TypeError('Network request failed'), 'verify').code).toBe(
      'NETWORK',
    );
  });

  it('treats unknown 4xx verify failures as bad or expired codes', () => {
    expect(
      mapSupabaseAuthError(supabaseError({ status: 403, message: 'Token has expired' }), 'verify')
        .code,
    ).toBe('CODE_EXPIRED');
    expect(
      mapSupabaseAuthError(supabaseError({ status: 401, message: 'Invalid token' }), 'verify').code,
    ).toBe('INVALID_CODE');
  });

  it('falls back to UNKNOWN for anything else', () => {
    expect(mapSupabaseAuthError('boom', 'request').code).toBe('UNKNOWN');
    expect(mapSupabaseAuthError(null, 'request').code).toBe('UNKNOWN');
  });
});
