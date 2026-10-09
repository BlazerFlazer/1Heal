import { isAuthError, type AuthErrorCode } from '@/services/auth/types';

/** An i18n key plus the variables its copy interpolates. */
export type AuthErrorMessage = { key: string; params?: { minutes: number } };

const SECONDS_PER_MINUTE = 60;

const MESSAGE_KEYS: Record<AuthErrorCode, string> = {
  INVALID_PHONE: 'errors.auth.invalidPhone',
  INVALID_CODE: 'errors.auth.invalidCode',
  CODE_EXPIRED: 'errors.auth.codeExpired',
  TOO_MANY_REQUESTS: 'errors.auth.tooManyRequests',
  LOCKED: 'errors.auth.locked',
  NETWORK: 'errors.network',
  UNKNOWN: 'errors.unknown',
};

/** Errors the user can act on in place; everything else is transient and goes to a toast. */
const INLINE_CODES: ReadonlySet<AuthErrorCode> = new Set([
  'INVALID_PHONE',
  'INVALID_CODE',
  'CODE_EXPIRED',
  'TOO_MANY_REQUESTS',
  'LOCKED',
]);

/** Whole minutes to wait, rounded up and never below one so the copy never says "0 min". */
export function retryAfterMinutes(retryAfterSec: number | undefined): number {
  return Math.max(1, Math.ceil((retryAfterSec ?? SECONDS_PER_MINUTE) / SECONDS_PER_MINUTE));
}

export function mapAuthError(code: AuthErrorCode, retryAfterSec?: number): AuthErrorMessage {
  if (code === 'TOO_MANY_REQUESTS') {
    return { key: MESSAGE_KEYS[code], params: { minutes: retryAfterMinutes(retryAfterSec) } };
  }
  return { key: MESSAGE_KEYS[code] };
}

/** The code behind any rejection; non-auth failures (bugs, aborted fetches) read as UNKNOWN. */
export function authErrorCode(error: unknown): AuthErrorCode {
  return isAuthError(error) ? error.code : 'UNKNOWN';
}

export function retryAfterSec(error: unknown): number | undefined {
  return isAuthError(error) ? error.retryAfterSec : undefined;
}

export function describeAuthError(error: unknown): AuthErrorMessage {
  return mapAuthError(authErrorCode(error), retryAfterSec(error));
}

export function isInlineAuthError(error: unknown): boolean {
  return INLINE_CODES.has(authErrorCode(error));
}
