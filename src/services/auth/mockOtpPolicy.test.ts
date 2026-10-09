import { MOCK_OTP_CODE, MOCK_OTP_LIMITS, MockOtpPolicy } from './mockOtpPolicy';
import { AuthError, type AuthErrorCode } from './types';

const PHONE = '+998901234567';
const SECOND = 1000;

function expectAuthError(fn: () => void, code: AuthErrorCode): AuthError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).code).toBe(code);
    return error as AuthError;
  }
  throw new Error(`expected AuthError ${code}`);
}

describe('MockOtpPolicy', () => {
  let nowMs: number;
  let policy: MockOtpPolicy;
  const advance = (seconds: number) => {
    nowMs += seconds * SECOND;
  };

  beforeEach(() => {
    nowMs = 1_700_000_000_000;
    policy = new MockOtpPolicy(() => nowMs);
  });

  it('enforces the resend cooldown', () => {
    policy.request(PHONE);
    const error = expectAuthError(() => policy.request(PHONE), 'TOO_MANY_REQUESTS');
    expect(error.retryAfterSec).toBe(MOCK_OTP_LIMITS.resendAfterSec);
    advance(MOCK_OTP_LIMITS.resendAfterSec);
    expect(() => policy.request(PHONE)).not.toThrow();
  });

  it('allows three requests per ten minutes and reports when the window frees up', () => {
    for (let i = 0; i < MOCK_OTP_LIMITS.maxRequestsPerWindow; i += 1) {
      policy.request(PHONE);
      advance(MOCK_OTP_LIMITS.resendAfterSec);
    }
    const error = expectAuthError(() => policy.request(PHONE), 'TOO_MANY_REQUESTS');
    const elapsed = MOCK_OTP_LIMITS.resendAfterSec * MOCK_OTP_LIMITS.maxRequestsPerWindow;
    expect(error.retryAfterSec).toBe(MOCK_OTP_LIMITS.requestWindowSec - elapsed);
    advance(error.retryAfterSec ?? 0);
    expect(() => policy.request(PHONE)).not.toThrow();
  });

  it('limits are per phone', () => {
    policy.request(PHONE);
    expect(() => policy.request('+998901234568')).not.toThrow();
  });

  it('accepts the mock code and consumes it', () => {
    policy.request(PHONE);
    expect(() => policy.verify(PHONE, ` ${MOCK_OTP_CODE} `)).not.toThrow();
    expectAuthError(() => policy.verify(PHONE, MOCK_OTP_CODE), 'CODE_EXPIRED');
  });

  it('rejects codes without a pending request or after expiry', () => {
    expectAuthError(() => policy.verify(PHONE, MOCK_OTP_CODE), 'CODE_EXPIRED');
    policy.request(PHONE);
    advance(MOCK_OTP_LIMITS.expiresInSec);
    expectAuthError(() => policy.verify(PHONE, MOCK_OTP_CODE), 'CODE_EXPIRED');
  });

  it('locks the phone after five wrong codes and unlocks after fifteen minutes', () => {
    policy.request(PHONE);
    for (let i = 1; i < MOCK_OTP_LIMITS.maxWrongAttempts; i += 1) {
      expectAuthError(() => policy.verify(PHONE, '000000'), 'INVALID_CODE');
    }
    const locked = expectAuthError(() => policy.verify(PHONE, '000000'), 'LOCKED');
    expect(locked.retryAfterSec).toBe(MOCK_OTP_LIMITS.lockoutSec);

    expectAuthError(() => policy.verify(PHONE, MOCK_OTP_CODE), 'LOCKED');
    advance(60);
    const stillLocked = expectAuthError(() => policy.request(PHONE), 'LOCKED');
    expect(stillLocked.retryAfterSec).toBe(MOCK_OTP_LIMITS.lockoutSec - 60);

    advance(MOCK_OTP_LIMITS.lockoutSec);
    expect(() => policy.request(PHONE)).not.toThrow();
    expectAuthError(() => policy.verify(PHONE, '000000'), 'INVALID_CODE');
    expect(() => policy.verify(PHONE, MOCK_OTP_CODE)).not.toThrow();
  });

  it('reset() forgets every phone', () => {
    policy.request(PHONE);
    policy.reset();
    expect(() => policy.request(PHONE)).not.toThrow();
  });
});
