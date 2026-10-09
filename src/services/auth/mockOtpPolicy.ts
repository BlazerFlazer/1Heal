import { AuthError } from './types';

/** The only code the mock accepts (documented dev convention, see src/services/README.md). */
export const MOCK_OTP_CODE = '123456';

export const MOCK_OTP_LIMITS = {
  resendAfterSec: 30,
  expiresInSec: 5 * 60,
  maxRequestsPerWindow: 3,
  requestWindowSec: 10 * 60,
  maxWrongAttempts: 5,
  lockoutSec: 15 * 60,
} as const;

interface PhoneState {
  /** Request timestamps (ms) inside the current window, oldest first. */
  requestedAt: number[];
  codeExpiresAt: number | null;
  wrongAttempts: number;
  lockedUntil: number | null;
}

function secondsUntil(timestampMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((timestampMs - nowMs) / 1000));
}

/**
 * In-memory mirror of the server-side OTP rules (rate limit, lockout, expiry) so the sign-in
 * screens can be built and tested against realistic failures without a backend.
 */
export class MockOtpPolicy {
  private readonly phones = new Map<string, PhoneState>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Records a code request. Throws LOCKED or TOO_MANY_REQUESTS (both carry `retryAfterSec`). */
  request(phoneE164: string): void {
    const nowMs = this.now();
    const state = this.stateFor(phoneE164);
    this.assertNotLocked(state, nowMs);

    const windowStart = nowMs - MOCK_OTP_LIMITS.requestWindowSec * 1000;
    state.requestedAt = state.requestedAt.filter((at) => at > windowStart);

    const last = state.requestedAt.at(-1);
    const resendAt = last === undefined ? nowMs : last + MOCK_OTP_LIMITS.resendAfterSec * 1000;
    if (nowMs < resendAt) {
      throw new AuthError('TOO_MANY_REQUESTS', { retryAfterSec: secondsUntil(resendAt, nowMs) });
    }
    if (state.requestedAt.length >= MOCK_OTP_LIMITS.maxRequestsPerWindow) {
      const oldest = state.requestedAt[0] ?? nowMs;
      const windowEnd = oldest + MOCK_OTP_LIMITS.requestWindowSec * 1000;
      throw new AuthError('TOO_MANY_REQUESTS', { retryAfterSec: secondsUntil(windowEnd, nowMs) });
    }

    state.requestedAt.push(nowMs);
    state.codeExpiresAt = nowMs + MOCK_OTP_LIMITS.expiresInSec * 1000;
  }

  /**
   * Checks a code against the pending request. Throws LOCKED, CODE_EXPIRED or INVALID_CODE.
   * Success consumes the code and clears the wrong-attempt counter.
   */
  verify(phoneE164: string, code: string): void {
    const nowMs = this.now();
    const state = this.stateFor(phoneE164);
    this.assertNotLocked(state, nowMs);

    if (state.codeExpiresAt === null || nowMs >= state.codeExpiresAt) {
      state.codeExpiresAt = null;
      throw new AuthError('CODE_EXPIRED');
    }
    if (code.trim() !== MOCK_OTP_CODE) {
      state.wrongAttempts += 1;
      if (state.wrongAttempts >= MOCK_OTP_LIMITS.maxWrongAttempts) {
        state.lockedUntil = nowMs + MOCK_OTP_LIMITS.lockoutSec * 1000;
        state.codeExpiresAt = null;
        throw new AuthError('LOCKED', { retryAfterSec: MOCK_OTP_LIMITS.lockoutSec });
      }
      throw new AuthError('INVALID_CODE');
    }

    state.codeExpiresAt = null;
    state.wrongAttempts = 0;
  }

  reset(): void {
    this.phones.clear();
  }

  private stateFor(phoneE164: string): PhoneState {
    let state = this.phones.get(phoneE164);
    if (!state) {
      state = { requestedAt: [], codeExpiresAt: null, wrongAttempts: 0, lockedUntil: null };
      this.phones.set(phoneE164, state);
    }
    return state;
  }

  private assertNotLocked(state: PhoneState, nowMs: number): void {
    if (state.lockedUntil === null) return;
    if (nowMs < state.lockedUntil) {
      throw new AuthError('LOCKED', { retryAfterSec: secondsUntil(state.lockedUntil, nowMs) });
    }
    state.lockedUntil = null;
    state.wrongAttempts = 0;
  }
}
