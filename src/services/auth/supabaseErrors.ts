import { AuthError, type AuthErrorCode } from './types';

/** Which call failed: the same Supabase code can mean a bad phone or a bad OTP. */
export type AuthPhase = 'request' | 'verify';

const RATE_LIMIT_CODES = new Set([
  'over_sms_send_rate_limit',
  'over_request_rate_limit',
  'over_email_send_rate_limit',
]);
const NETWORK_ERROR_NAMES = new Set(['AuthRetryableFetchError']);
const NETWORK_MESSAGE = /network request failed|failed to fetch|load failed/i;

interface ErrorShape {
  name: string;
  message: string;
  code: string | undefined;
  status: number | undefined;
}

function readError(error: unknown): ErrorShape {
  const record =
    typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
  return {
    name: typeof record.name === 'string' ? record.name : '',
    message: typeof record.message === 'string' ? record.message : String(error),
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

/** Supabase phrases rate limits as "…you can only request this after 42 seconds." */
export function retryAfterFromMessage(message: string): number | undefined {
  const match = /after (\d+) second/i.exec(message);
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function classify({ name, message, code, status }: ErrorShape, phase: AuthPhase): AuthErrorCode {
  if ((code !== undefined && RATE_LIMIT_CODES.has(code)) || status === 429) {
    return 'TOO_MANY_REQUESTS';
  }
  if (code === 'otp_expired') return 'CODE_EXPIRED';
  if (code === 'user_banned') return 'LOCKED';
  if (code === 'validation_failed') return phase === 'request' ? 'INVALID_PHONE' : 'INVALID_CODE';
  if (code === 'invalid_credentials') return 'INVALID_CODE';
  if (NETWORK_ERROR_NAMES.has(name) || (status === undefined && NETWORK_MESSAGE.test(message))) {
    return 'NETWORK';
  }
  if (phase === 'verify' && status !== undefined && status < 500) {
    return /expired/i.test(message) ? 'CODE_EXPIRED' : 'INVALID_CODE';
  }
  return 'UNKNOWN';
}

/** Translates anything thrown or returned by supabase-js into the app's `AuthError`. */
export function mapSupabaseAuthError(error: unknown, phase: AuthPhase): AuthError {
  if (error instanceof AuthError) return error;
  const shape = readError(error);
  const code = classify(shape, phase);
  const retryAfterSec =
    code === 'TOO_MANY_REQUESTS' || code === 'LOCKED'
      ? retryAfterFromMessage(shape.message)
      : undefined;
  return new AuthError(code, { message: shape.message, cause: error, retryAfterSec });
}
