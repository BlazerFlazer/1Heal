import type { JsonStorage } from '@/services/storage/jsonStorage';
import { secureStorage } from '@/services/storage/secureStorage';
import { SECURE_KEYS } from '@/services/storage/storageKeys';
import { parseUzPhone } from '@/shared/utils/phone';

import type { AuthService, AuthStateListener } from './AuthService';
import { getOrCreateDeviceId } from './deviceId';
import { maskPhoneE164 } from './maskPhone';
import { MOCK_OTP_LIMITS, MockOtpPolicy } from './mockOtpPolicy';
import {
  AuthError,
  type OtpRequestResult,
  type Role,
  type Session,
  type SessionProfile,
  sessionSchema,
} from './types';

export { MOCK_OTP_CODE, MOCK_OTP_LIMITS } from './mockOtpPolicy';

/** Dev conventions: phones ending in "00" get the partner role; this exact phone is also admin. */
export const MOCK_ADMIN_PHONE = '+998900000000';
export const MOCK_PARTNER_SUFFIX = '00';
export const MOCK_SESSION_TTL_MS = 60 * 60 * 1000;
const DEFAULT_LATENCY_MS = 400;

export interface MockAuthServiceOptions {
  /** Simulated network delay; tests pass 0. */
  latencyMs?: number;
  now?: () => number;
  storage?: JsonStorage;
}

export function rolesForPhone(phoneE164: string): Role[] {
  const roles: Role[] = ['member'];
  if (phoneE164.endsWith(MOCK_PARTNER_SUFFIX)) roles.push('partner');
  if (phoneE164 === MOCK_ADMIN_PHONE) roles.push('admin');
  return roles;
}

/**
 * Deterministic, backend-free implementation for development and tests. Mirrors the real
 * provider's behaviour (rate limits, lockout, expiry, token rotation, persisted session).
 */
export class MockAuthService implements AuthService {
  private readonly latencyMs: number;
  private readonly now: () => number;
  private readonly storage: JsonStorage;
  private readonly policy: MockOtpPolicy;
  private readonly listeners = new Set<AuthStateListener>();
  private current: Session | null = null;
  private tokenCounter = 0;

  constructor(options: MockAuthServiceOptions = {}) {
    this.latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
    this.now = options.now ?? Date.now;
    this.storage = options.storage ?? secureStorage;
    this.policy = new MockOtpPolicy(this.now);
  }

  async requestOtp(phoneE164: string): Promise<OtpRequestResult> {
    await this.simulateLatency();
    const phone = normalizePhone(phoneE164);
    this.policy.request(phone);
    return {
      resendAfterSec: MOCK_OTP_LIMITS.resendAfterSec,
      expiresInSec: MOCK_OTP_LIMITS.expiresInSec,
      maskedPhone: maskPhoneE164(phone),
    };
  }

  async verifyOtp(phoneE164: string, code: string): Promise<Session> {
    await this.simulateLatency();
    const phone = normalizePhone(phoneE164);
    this.policy.verify(phone, code);
    const deviceId = await getOrCreateDeviceId(this.storage);
    const session = this.buildSession(phone, deviceId, this.current?.profile ?? {});
    await this.commit(session);
    return session;
  }

  async restoreSession(): Promise<Session | null> {
    const stored = await this.storage.getJson(SECURE_KEYS.authSession, sessionSchema);
    if (!stored) return null;
    this.current = stored;
    return Date.parse(stored.expiresAt) <= this.now() ? this.refreshSession() : stored;
  }

  async refreshSession(): Promise<Session | null> {
    await this.simulateLatency();
    const previous =
      this.current ?? (await this.storage.getJson(SECURE_KEYS.authSession, sessionSchema));
    if (!previous) return null;
    const rotated = this.buildSession(previous.phoneE164, previous.deviceId, previous.profile);
    await this.commit(rotated);
    return rotated;
  }

  async signOut(): Promise<void> {
    this.current = null;
    await this.storage.remove(SECURE_KEYS.authSession);
    this.emit(null);
  }

  onAuthStateChange(callback: AuthStateListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private buildSession(phoneE164: string, deviceId: string, profile: SessionProfile): Session {
    this.tokenCounter += 1;
    const issuedAt = this.now();
    const stamp = `${issuedAt.toString(36)}-${this.tokenCounter}`;
    return {
      userId: `mock-${phoneE164.slice(1)}`,
      phoneE164,
      accessToken: `mock-access-${stamp}`,
      refreshToken: `mock-refresh-${stamp}`,
      expiresAt: new Date(issuedAt + MOCK_SESSION_TTL_MS).toISOString(),
      roles: rolesForPhone(phoneE164),
      deviceId,
      profile,
    };
  }

  private async commit(session: Session): Promise<void> {
    this.current = session;
    await this.storage.setJson(SECURE_KEYS.authSession, session);
    this.emit(session);
  }

  private emit(session: Session | null): void {
    for (const listener of this.listeners) listener(session);
  }

  private simulateLatency(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}

function normalizePhone(input: string): string {
  const parsed = parseUzPhone(input);
  if (!parsed) throw new AuthError('INVALID_PHONE');
  return parsed.e164;
}
