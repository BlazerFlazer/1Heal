import type { Session as SupabaseSession, User } from '@supabase/supabase-js';
import { waitFor } from '@testing-library/react-native';

import { createJsonStorage, createMemoryBackend } from '@/services/storage/jsonStorage';

import {
  SUPABASE_OTP_EXPIRES_IN_SEC,
  SUPABASE_OTP_RESEND_AFTER_SEC,
  type SupabaseAuthApi,
  SupabaseAuthService,
} from './SupabaseAuthService';
import { AuthError, type AuthErrorCode } from './types';

const PHONE = '+998901234567';

function fakeJwt(payload: unknown): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`;
}

function fakeSession(roles: string[] = ['member']): SupabaseSession {
  const user = {
    id: 'user-1',
    aud: 'authenticated',
    phone: '998901234567',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  } as User;
  return {
    access_token: fakeJwt({ sub: 'user-1', app_metadata: { roles } }),
    refresh_token: 'refresh-1',
    expires_in: 3600,
    expires_at: 1_800_000_000,
    token_type: 'bearer',
    user,
  };
}

function apiError(code: string, status: number, message = code) {
  return Object.assign(new Error(message), { name: 'AuthApiError', code, status });
}

type Listener = Parameters<SupabaseAuthApi['onAuthStateChange']>[0];

function fakeAuth() {
  const listeners = new Set<Listener>();
  const unsubscribe = jest.fn();
  const api = {
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn((listener: Listener) => {
      listeners.add(listener);
      return { data: { subscription: { id: 'sub', callback: listener, unsubscribe } } };
    }),
  };
  return {
    api: api as unknown as SupabaseAuthApi,
    mocks: api,
    unsubscribe,
    emit: (session: SupabaseSession | null) => {
      for (const listener of listeners) void listener('SIGNED_IN', session);
    },
  };
}

async function expectAuthError(promise: Promise<unknown>, code: AuthErrorCode): Promise<AuthError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe(code);
    return error as AuthError;
  }
  throw new Error(`expected AuthError ${code}`);
}

describe('SupabaseAuthService', () => {
  let auth: ReturnType<typeof fakeAuth>;
  let service: SupabaseAuthService;

  beforeEach(() => {
    auth = fakeAuth();
    service = new SupabaseAuthService(auth.api, createJsonStorage(createMemoryBackend()));
  });

  describe('requestOtp', () => {
    it('sends the OTP and returns the display hints', async () => {
      auth.mocks.signInWithOtp.mockResolvedValue({ data: {}, error: null });
      await expect(service.requestOtp('90 123 45 67')).resolves.toEqual({
        resendAfterSec: SUPABASE_OTP_RESEND_AFTER_SEC,
        expiresInSec: SUPABASE_OTP_EXPIRES_IN_SEC,
        maskedPhone: '+998 90 *** ** 67',
      });
      expect(auth.mocks.signInWithOtp).toHaveBeenCalledWith({ phone: PHONE });
    });

    it('rejects invalid phones before calling Supabase', async () => {
      await expectAuthError(service.requestOtp('+1555'), 'INVALID_PHONE');
      expect(auth.mocks.signInWithOtp).not.toHaveBeenCalled();
    });

    it('maps rate limits with their cooldown', async () => {
      auth.mocks.signInWithOtp.mockResolvedValue({
        data: {},
        error: apiError('over_sms_send_rate_limit', 429, 'only after 55 seconds.'),
      });
      const error = await expectAuthError(service.requestOtp(PHONE), 'TOO_MANY_REQUESTS');
      expect(error.retryAfterSec).toBe(55);
    });

    it('maps thrown fetch failures to NETWORK', async () => {
      auth.mocks.signInWithOtp.mockRejectedValue(new TypeError('Network request failed'));
      await expectAuthError(service.requestOtp(PHONE), 'NETWORK');
    });
  });

  describe('verifyOtp', () => {
    it('verifies with type sms and maps the session', async () => {
      auth.mocks.verifyOtp.mockResolvedValue({
        data: { session: fakeSession(['member', 'partner']), user: null },
        error: null,
      });
      const session = await service.verifyOtp(PHONE, ' 123456 ');
      expect(auth.mocks.verifyOtp).toHaveBeenCalledWith({
        phone: PHONE,
        token: '123456',
        type: 'sms',
      });
      expect(session).toMatchObject({
        userId: 'user-1',
        phoneE164: PHONE,
        roles: ['member', 'partner'],
      });
      expect(session.deviceId.length).toBeGreaterThanOrEqual(8);
    });

    it('maps expired and invalid codes', async () => {
      auth.mocks.verifyOtp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: apiError('otp_expired', 403),
      });
      await expectAuthError(service.verifyOtp(PHONE, '000000'), 'CODE_EXPIRED');
      auth.mocks.verifyOtp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: apiError('invalid_credentials', 400),
      });
      await expectAuthError(service.verifyOtp(PHONE, '000000'), 'INVALID_CODE');
    });

    it('fails when Supabase returns no session', async () => {
      auth.mocks.verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: null });
      await expectAuthError(service.verifyOtp(PHONE, '123456'), 'UNKNOWN');
    });
  });

  describe('sessions', () => {
    it('restores the persisted session and keeps one device id', async () => {
      auth.mocks.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
      const first = await service.restoreSession();
      const second = await service.restoreSession();
      expect(first?.userId).toBe('user-1');
      expect(second?.deviceId).toBe(first?.deviceId);
    });

    it('returns null when nothing is persisted or storage fails', async () => {
      auth.mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      await expect(service.restoreSession()).resolves.toBeNull();
      auth.mocks.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: apiError('session_not_found', 400),
      });
      await expect(service.restoreSession()).resolves.toBeNull();
    });

    it('refreshes, returns null for a lost session and rethrows network failures', async () => {
      auth.mocks.refreshSession.mockResolvedValueOnce({
        data: { session: fakeSession(), user: null },
        error: null,
      });
      await expect(service.refreshSession()).resolves.toMatchObject({ refreshToken: 'refresh-1' });

      auth.mocks.refreshSession.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: apiError('refresh_token_not_found', 400),
      });
      await expect(service.refreshSession()).resolves.toBeNull();

      auth.mocks.refreshSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expectAuthError(service.refreshSession(), 'NETWORK');
    });

    it('signs out globally and falls back to a local sign-out when offline', async () => {
      auth.mocks.signOut.mockResolvedValueOnce({ error: null });
      await service.signOut();
      expect(auth.mocks.signOut).toHaveBeenLastCalledWith({ scope: 'global' });

      auth.mocks.signOut
        .mockResolvedValueOnce({ error: new TypeError('Network request failed') })
        .mockResolvedValueOnce({ error: null });
      await service.signOut();
      expect(auth.mocks.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
    });
  });

  describe('onAuthStateChange', () => {
    it('maps Supabase events to app sessions and unsubscribes', async () => {
      const listener = jest.fn();
      const unsubscribe = service.onAuthStateChange(listener);

      auth.emit(fakeSession(['admin']));
      await waitFor(() =>
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ roles: ['admin'] })),
      );

      auth.emit(null);
      expect(listener).toHaveBeenLastCalledWith(null);

      unsubscribe();
      expect(auth.unsubscribe).toHaveBeenCalled();
    });
  });
});
