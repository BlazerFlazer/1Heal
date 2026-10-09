import type { Session as SupabaseSession, User } from '@supabase/supabase-js';

import { decodeJwtPayload, rolesFromAccessToken, toSession } from './supabaseSession';
import { AuthError, sessionSchema } from './types';

function fakeJwt(payload: unknown): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    phone: '998901234567',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function fakeSupabaseSession(overrides: Partial<SupabaseSession> = {}): SupabaseSession {
  return {
    access_token: fakeJwt({ sub: 'user-1', app_metadata: { roles: ['member', 'partner'] } }),
    refresh_token: 'refresh-1',
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: 'bearer',
    user: fakeUser(),
    ...overrides,
  };
}

describe('decodeJwtPayload', () => {
  it('decodes base64url payloads including non-ASCII text', () => {
    const token = fakeJwt({ name: 'Азиз Каримов', n: 1 });
    expect(decodeJwtPayload(token)).toEqual({ name: 'Азиз Каримов', n: 1 });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('abc')).toBeNull();
    expect(decodeJwtPayload('a.!!!.c')).toBeNull();
    expect(decodeJwtPayload('a.bm90IGpzb24.c')).toBeNull();
  });
});

describe('rolesFromAccessToken', () => {
  it('reads app_metadata.roles', () => {
    expect(rolesFromAccessToken(fakeJwt({ app_metadata: { roles: ['admin'] } }))).toEqual([
      'admin',
    ]);
  });

  it('defaults to member when the claim is missing or invalid', () => {
    expect(rolesFromAccessToken(fakeJwt({ app_metadata: {} }))).toEqual(['member']);
    expect(rolesFromAccessToken(fakeJwt({ app_metadata: { roles: ['king'] } }))).toEqual([
      'member',
    ]);
    expect(rolesFromAccessToken(fakeJwt({ app_metadata: { roles: [] } }))).toEqual(['member']);
    expect(rolesFromAccessToken('not-a-jwt')).toEqual(['member']);
  });
});

describe('toSession', () => {
  it('maps a Supabase session to the app session', () => {
    const session = toSession(fakeSupabaseSession(), 'device-1');
    expect(sessionSchema.safeParse(session).success).toBe(true);
    expect(session).toEqual({
      userId: 'user-1',
      phoneE164: '+998901234567',
      accessToken: expect.any(String),
      refreshToken: 'refresh-1',
      expiresAt: new Date(1_800_000_000 * 1000).toISOString(),
      roles: ['member', 'partner'],
      deviceId: 'device-1',
      profile: {},
    });
  });

  it('maps profile fields from user_metadata and keeps a leading plus', () => {
    const session = toSession(
      fakeSupabaseSession({
        user: fakeUser({
          phone: '+998901234567',
          user_metadata: { full_name: 'Aziz', locale: 'uz', ignored: true },
        }),
      }),
      'device-1',
    );
    expect(session.profile).toEqual({ fullName: 'Aziz', locale: 'uz' });
  });

  it('derives expiry from expires_in when expires_at is absent', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
    const session = toSession(fakeSupabaseSession({ expires_at: undefined }), 'device-1');
    expect(session.expiresAt).toBe('2026-10-09T11:00:00.000Z');
    jest.useRealTimers();
  });

  it('rejects users without an Uzbek phone', () => {
    expect(() =>
      toSession(fakeSupabaseSession({ user: fakeUser({ phone: undefined }) }), 'device-1'),
    ).toThrow(AuthError);
  });
});
