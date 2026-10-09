import { createJsonStorage, createMemoryBackend } from '@/services/storage/jsonStorage';
import { SECURE_KEYS } from '@/services/storage/storageKeys';

import {
  MOCK_ADMIN_PHONE,
  MOCK_OTP_CODE,
  MOCK_OTP_LIMITS,
  MOCK_SESSION_TTL_MS,
  MockAuthService,
  rolesForPhone,
} from './MockAuthService';
import { AuthError, type AuthErrorCode, sessionSchema } from './types';

const PHONE = '+998901234567';

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

describe('rolesForPhone', () => {
  it('follows the dev conventions', () => {
    expect(rolesForPhone(PHONE)).toEqual(['member']);
    expect(rolesForPhone('+998901234500')).toEqual(['member', 'partner']);
    expect(rolesForPhone(MOCK_ADMIN_PHONE)).toEqual(['member', 'partner', 'admin']);
  });
});

describe('MockAuthService', () => {
  let service: MockAuthService;
  let storage: ReturnType<typeof createJsonStorage>;

  const signIn = async (phone = PHONE) => {
    await service.requestOtp(phone);
    return service.verifyOtp(phone, MOCK_OTP_CODE);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
    storage = createJsonStorage(createMemoryBackend());
    service = new MockAuthService({ latencyMs: 0, storage });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('answers a code request with resend and expiry hints', async () => {
    await expect(service.requestOtp('90 123 45 67')).resolves.toEqual({
      resendAfterSec: MOCK_OTP_LIMITS.resendAfterSec,
      expiresInSec: MOCK_OTP_LIMITS.expiresInSec,
      maskedPhone: '+998 90 *** ** 67',
    });
  });

  it('rejects phones that are not Uzbek mobile numbers', async () => {
    await expectAuthError(service.requestOtp('+79991234567'), 'INVALID_PHONE');
    await expectAuthError(service.verifyOtp('12', MOCK_OTP_CODE), 'INVALID_PHONE');
  });

  it('rate-limits requests per phone', async () => {
    for (let i = 0; i < MOCK_OTP_LIMITS.maxRequestsPerWindow; i += 1) {
      await service.requestOtp(PHONE);
      jest.advanceTimersByTime(MOCK_OTP_LIMITS.resendAfterSec * 1000);
    }
    const error = await expectAuthError(service.requestOtp(PHONE), 'TOO_MANY_REQUESTS');
    expect(error.retryAfterSec).toBeGreaterThan(0);
    jest.advanceTimersByTime(MOCK_OTP_LIMITS.requestWindowSec * 1000);
    await expect(service.requestOtp(PHONE)).resolves.toBeDefined();
  });

  it('locks after five wrong codes and unlocks after the lockout', async () => {
    await service.requestOtp(PHONE);
    for (let i = 1; i < MOCK_OTP_LIMITS.maxWrongAttempts; i += 1) {
      await expectAuthError(service.verifyOtp(PHONE, '000000'), 'INVALID_CODE');
    }
    const locked = await expectAuthError(service.verifyOtp(PHONE, '000000'), 'LOCKED');
    expect(locked.retryAfterSec).toBe(MOCK_OTP_LIMITS.lockoutSec);
    await expectAuthError(service.requestOtp(PHONE), 'LOCKED');
    jest.advanceTimersByTime(MOCK_OTP_LIMITS.lockoutSec * 1000);
    await expect(signIn()).resolves.toMatchObject({ phoneE164: PHONE });
  });

  it('expires codes after five minutes', async () => {
    await service.requestOtp(PHONE);
    jest.advanceTimersByTime(MOCK_OTP_LIMITS.expiresInSec * 1000);
    await expectAuthError(service.verifyOtp(PHONE, MOCK_OTP_CODE), 'CODE_EXPIRED');
  });

  it('signs in with the mock code, persists the session and notifies listeners', async () => {
    const listener = jest.fn();
    service.onAuthStateChange(listener);
    const session = await signIn();
    expect(sessionSchema.safeParse(session).success).toBe(true);
    expect(session).toMatchObject({ userId: 'mock-998901234567', roles: ['member'] });
    expect(Date.parse(session.expiresAt)).toBe(Date.now() + MOCK_SESSION_TTL_MS);
    expect(listener).toHaveBeenCalledWith(session);
    await expect(storage.getJson(SECURE_KEYS.authSession, sessionSchema)).resolves.toEqual(session);
  });

  it('assigns partner and admin roles by phone convention', async () => {
    await expect(signIn('+998901234500')).resolves.toMatchObject({ roles: ['member', 'partner'] });
    await expect(signIn(MOCK_ADMIN_PHONE)).resolves.toMatchObject({
      roles: ['member', 'partner', 'admin'],
    });
  });

  it('keeps one device id across sign-outs', async () => {
    const first = await signIn();
    await service.signOut();
    jest.advanceTimersByTime(MOCK_OTP_LIMITS.resendAfterSec * 1000);
    const second = await signIn();
    expect(second.deviceId).toBe(first.deviceId);
  });

  it('restores a persisted session into a fresh instance', async () => {
    const session = await signIn();
    const fresh = new MockAuthService({ latencyMs: 0, storage });
    await expect(fresh.restoreSession()).resolves.toEqual(session);
  });

  it('returns null when nothing is persisted', async () => {
    await expect(service.restoreSession()).resolves.toBeNull();
    await expect(service.refreshSession()).resolves.toBeNull();
  });

  it('refreshes an expired session on restore and rotates its tokens', async () => {
    const session = await signIn();
    jest.advanceTimersByTime(MOCK_SESSION_TTL_MS + 1);
    const fresh = new MockAuthService({ latencyMs: 0, storage });
    const restored = await fresh.restoreSession();
    expect(restored).not.toBeNull();
    expect(restored?.accessToken).not.toBe(session.accessToken);
    expect(restored?.refreshToken).not.toBe(session.refreshToken);
    expect(Date.parse(restored?.expiresAt ?? '')).toBeGreaterThan(Date.now());
  });

  it('rotates tokens on refresh and persists them', async () => {
    const listener = jest.fn();
    const session = await signIn();
    service.onAuthStateChange(listener);
    const refreshed = await service.refreshSession();
    expect(refreshed?.accessToken).not.toBe(session.accessToken);
    expect(refreshed?.userId).toBe(session.userId);
    expect(listener).toHaveBeenCalledWith(refreshed);
    await expect(storage.getJson(SECURE_KEYS.authSession, sessionSchema)).resolves.toEqual(
      refreshed,
    );
  });

  it('signs out, clears storage and notifies with null', async () => {
    const listener = jest.fn();
    await signIn();
    const unsubscribe = service.onAuthStateChange(listener);
    await service.signOut();
    expect(listener).toHaveBeenCalledWith(null);
    await expect(storage.getJson(SECURE_KEYS.authSession, sessionSchema)).resolves.toBeNull();
    await expect(service.restoreSession()).resolves.toBeNull();

    unsubscribe();
    jest.advanceTimersByTime(MOCK_OTP_LIMITS.resendAfterSec * 1000);
    await signIn();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('simulates latency outside tests', async () => {
    const slow = new MockAuthService({ latencyMs: 400, storage });
    const settled = jest.fn();
    const request = slow.requestOtp(PHONE).then(settled);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    jest.advanceTimersByTime(400);
    await request;
    expect(settled).toHaveBeenCalled();
  });
});
