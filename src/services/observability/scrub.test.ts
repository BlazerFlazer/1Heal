import type { ErrorEvent } from '@sentry/react-native';

import { REDACTED, scrubBreadcrumb, scrubEvent, scrubText, scrubValue, stripQuery } from './scrub';

describe('scrubText', () => {
  it.each([
    ['+998 90 123 45 67', REDACTED],
    ['+998 90 123 45 67', REDACTED],
    ['998901234567', REDACTED],
    ['call (90) 123-45-67 now', `call ${REDACTED} now`],
    ['user a.b@example.uz failed', `user ${REDACTED} failed`],
    ['Bearer abc.def-123', REDACTED],
    ['token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl here', `token ${REDACTED} here`],
  ])('redacts %p', (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it('keeps ordinary diagnostic text', () => {
    expect(scrubText('Network request failed after 3 retries (HTTP 503)')).toBe(
      'Network request failed after 3 retries (HTTP 503)',
    );
  });
});

describe('scrubValue', () => {
  it('drops sensitive keys and scrubs nested strings', () => {
    const input = {
      phone: '+998901234567',
      otp: '123456',
      access_token: 'x',
      nested: { note: 'reach me at 998901234567', count: 3 },
      list: ['ok', '+998 33 111 22 33'],
    };
    expect(scrubValue(input)).toEqual({
      phone: REDACTED,
      otp: REDACTED,
      access_token: REDACTED,
      nested: { note: `reach me at ${REDACTED}`, count: 3 },
      list: ['ok', REDACTED],
    });
  });

  it('keeps SDK trace identifiers intact', () => {
    const trace = { trace_id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', span_id: '1234567890abcdef' };
    expect(scrubValue(trace)).toEqual(trace);
  });
});

describe('stripQuery', () => {
  it('removes query strings and fragments', () => {
    expect(stripQuery('https://api.example.uz/auth?phone=998901234567#x')).toBe(
      'https://api.example.uz/auth',
    );
    expect(stripQuery('/venues/42')).toBe('/venues/42');
  });
});

describe('scrubEvent', () => {
  const event: ErrorEvent = {
    type: undefined,
    message: 'OTP sent to +998 90 123 45 67',
    transaction: '/verify?phone=%2B998901234567',
    exception: { values: [{ type: 'AuthError', value: 'Invalid code for 998901234567' }] },
    request: {
      url: 'https://x.supabase.co/auth/v1/otp?phone=1',
      query_string: 'phone=1',
      cookies: { sid: 'abc' },
      headers: { Authorization: 'Bearer abc', 'Content-Type': 'application/json' },
    },
    user: { id: 'user-uuid', ip_address: '10.0.0.1', username: 'Aziz' },
    breadcrumbs: [{ message: 'tap +998 90 123 45 67', data: { url: '/sign-in?phone=1' } }],
    extra: { phone_e164: '+998901234567', venueId: 'v1' },
  };

  it('scrubs every free-text field and keeps only the user id', () => {
    const out = scrubEvent(event);
    expect(out.message).toBe(`OTP sent to ${REDACTED}`);
    expect(out.transaction).toBe('/verify');
    expect(out.exception?.values?.[0]?.value).toBe(`Invalid code for ${REDACTED}`);
    expect(out.request?.url).toBe('https://x.supabase.co/auth/v1/otp');
    expect(out.request?.query_string).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toEqual({
      Authorization: REDACTED,
      'Content-Type': 'application/json',
    });
    expect(out.user).toEqual({ id: 'user-uuid' });
    expect(out.breadcrumbs?.[0]).toEqual({ message: `tap ${REDACTED}`, data: { url: '/sign-in' } });
    expect(out.extra).toEqual({ phone_e164: REDACTED, venueId: 'v1' });
  });

  it('does not mutate the original event', () => {
    scrubEvent(event);
    expect(event.message).toBe('OTP sent to +998 90 123 45 67');
  });

  it('drops a user without an id', () => {
    expect(scrubEvent({ type: undefined, user: { ip_address: '1.1.1.1' } }).user).toBeUndefined();
  });
});

describe('scrubBreadcrumb', () => {
  it('scrubs message and data', () => {
    expect(
      scrubBreadcrumb({ category: 'fetch', data: { url: 'https://a/b?token=1', status: 200 } }),
    ).toEqual({ category: 'fetch', message: undefined, data: { url: 'https://a/b', status: 200 } });
  });
});
