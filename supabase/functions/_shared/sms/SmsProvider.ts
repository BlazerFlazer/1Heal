/**
 * Provider-agnostic SMS delivery (ADR-003). Implementations: `EskizSmsProvider` (production,
 * Uzbekistan) and `MockSmsProvider` (dev, tests). The hook never depends on a concrete class.
 */
export type SmsPurpose = 'otp' | 'notice';

export interface SmsSendInput {
  /** E.164 with the plus sign, e.g. "+998901234567". */
  to: string;
  text: string;
  purpose: SmsPurpose;
}

export interface SmsSendResult {
  /** The provider's message id when it returns one (stored in sms_send_log.provider_msg_id). */
  providerMessageId?: string;
}

export interface SmsProvider {
  /** Stored in sms_send_log.provider: "eskiz" | "mock". */
  readonly name: string;
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

export const SMS_ERROR_CODES = [
  'AUTH',
  'RATE_LIMIT',
  'INVALID_NUMBER',
  'PROVIDER_DOWN',
  'UNKNOWN',
] as const;
export type SmsErrorCode = (typeof SMS_ERROR_CODES)[number];

/** Codes for which a retry a little later may succeed. */
const RETRYABLE_CODES: ReadonlySet<SmsErrorCode> = new Set(['RATE_LIMIT', 'PROVIDER_DOWN']);

export interface SmsErrorOptions {
  /** HTTP status from the provider, when there was one. */
  status?: number;
  cause?: unknown;
}

/** The only error type a provider throws; the hook switches on `code`, never on messages. */
export class SmsError extends Error {
  readonly code: SmsErrorCode;
  readonly status?: number;

  constructor(code: SmsErrorCode, message: string, options: SmsErrorOptions = {}) {
    super(message);
    this.name = 'SmsError';
    this.code = code;
    this.status = options.status;
    this.cause = options.cause;
  }

  get retryable(): boolean {
    return RETRYABLE_CODES.has(this.code);
  }
}

export function isSmsError(error: unknown): error is SmsError {
  return error instanceof SmsError;
}
