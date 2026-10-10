/**
 * The "Send SMS" auth hook, runtime agnostic: verify the Standard Webhooks signature, validate the
 * payload, apply the extra rate limits, render the OTP text, deliver, log.
 *
 * Response contract (supabase/auth internal/hooks/hookshttp + hookserrors, verified 2026-10-10):
 * - 200 `{}`: delivered.
 * - 200 `{ error: { http_code, message } }`: Auth returns `http_code` + `message` to the end user
 *   without retrying. This is the only way a 429 (our limits) or 400 reaches the app; the app maps
 *   429 to TOO_MANY_REQUESTS and reads "after N seconds" from the message.
 * - 401 / 400: a request Auth should not have sent (bad signature, bad payload); Auth answers the
 *   user with a generic 500. 503 + `retry-after`: Auth retries within its 5 s budget.
 */
import { createConsoleLogger, type Logger } from '../log';
import { maskPhone } from '../phone';
import { isSmsError, type SmsError, type SmsProvider } from '../sms/SmsProvider';
import type {
  RateLimitDecision,
  RateLimiter,
  SmsLogEntry,
  SmsLogStatus,
  SmsSendLog,
} from './rateLimiter';
import { parseSendSmsPayload, type SendSmsPayload } from './sendSmsPayload';
import { OTP_TEMPLATES, renderOtpSms, type OtpTemplates } from './smsTemplates';
import { type HeaderReader, verifyStandardWebhook } from './standardWebhooks';

export interface HookErrorBody {
  error: { http_code: number; message: string };
}
export type HookBody = Record<string, never> | HookErrorBody;

export interface HookResponse {
  status: number;
  headers: Record<string, string>;
  body: HookBody;
}

export interface SendSmsHookInput {
  rawBody: string;
  headers: HeaderReader;
  /** SEND_SMS_HOOK_SECRET: "v1,whsec_<base64>", several separated by "|" while rotating. */
  secret: string;
  provider: SmsProvider;
  rateLimiter: RateLimiter;
  sendLog: SmsSendLog;
  templates?: OtpTemplates;
  log?: Logger;
  now?: () => Date;
  /** Signature replay window in seconds (tests). */
  toleranceSec?: number;
}

const PURPOSE = 'otp';
/** Auth's payload is well under 4 KiB; anything far larger is not from Auth (HMAC costs CPU). */
export const MAX_BODY_CHARS = 64 * 1024;
/** Seconds Auth waits before retrying a 503 (its back-off is 2 s, budget 5 s in total). */
const RETRY_AFTER_SEC = '1';

export async function handleSendSms(input: SendSmsHookInput): Promise<HookResponse> {
  const log = input.log ?? createConsoleLogger();
  const now = input.now ?? (() => new Date());
  const startedAt = now().getTime();
  const elapsed = (): number => now().getTime() - startedAt;

  if (input.rawBody.length > MAX_BODY_CHARS) {
    log.log('warn', 'sms_hook_body_too_large', { chars: input.rawBody.length, ms: elapsed() });
    return requestError(413, 'Payload too large');
  }

  const signature = await verifyStandardWebhook({
    secret: input.secret,
    headers: input.headers,
    body: input.rawBody,
    nowSec: Math.floor(startedAt / 1000),
    toleranceSec: input.toleranceSec,
  });
  if (!signature.ok) {
    log.log('warn', 'sms_hook_signature_rejected', { reason: signature.reason, ms: elapsed() });
    return requestError(401, 'Invalid webhook signature');
  }

  const parsed = parseSendSmsPayload(input.rawBody);
  if (!parsed.ok) {
    log.log('warn', 'sms_hook_payload_rejected', { reason: parsed.error, ms: elapsed() });
    return requestError(400, `Invalid payload: ${parsed.error}`);
  }
  const { payload } = parsed;
  const fields = { phone_masked: maskPhone(payload.phone), provider: input.provider.name };

  let decision: RateLimitDecision;
  try {
    decision = await input.rateLimiter.check({
      phone: payload.phone,
      ip: payload.ip,
      purpose: PURPOSE,
      now: now(),
    });
  } catch (error) {
    log.log('error', 'sms_rate_limit_unavailable', {
      ...fields,
      error: describe(error),
      ms: elapsed(),
    });
    return requestError(503, 'SMS rate limiter unavailable', { 'retry-after': RETRY_AFTER_SEC });
  }
  if (!decision.allowed) {
    await record(input.sendLog, log, payload, input.provider.name, 'rate_limited', now());
    log.log('info', 'sms_rate_limited', {
      ...fields,
      scope: decision.scope,
      rule: decision.rule,
      retry_after_sec: decision.retryAfterSec,
      ms: elapsed(),
    });
    return userError(
      429,
      `Too many SMS requests, you can only request this after ${decision.retryAfterSec} seconds.`,
    );
  }

  const text = renderOtpSms(payload.locale, payload.otp, input.templates ?? OTP_TEMPLATES);
  try {
    const result = await input.provider.send({ to: payload.phone, text, purpose: PURPOSE });
    await record(
      input.sendLog,
      log,
      payload,
      input.provider.name,
      'sent',
      now(),
      result.providerMessageId,
    );
    log.log('info', 'sms_sent', {
      ...fields,
      locale: payload.locale,
      provider_msg_id: result.providerMessageId,
      ms: elapsed(),
    });
    return ok();
  } catch (error) {
    await record(input.sendLog, log, payload, input.provider.name, 'failed', now());
    const code = isSmsError(error) ? error.code : 'UNKNOWN';
    log.log('error', 'sms_send_failed', { ...fields, code, error: describe(error), ms: elapsed() });
    return failureResponse(isSmsError(error) ? error : null);
  }
}

function failureResponse(error: SmsError | null): HookResponse {
  if (error?.code === 'INVALID_NUMBER') return userError(400, 'Invalid phone number');
  if (error?.retryable) {
    return requestError(503, 'SMS service temporarily unavailable', {
      'retry-after': RETRY_AFTER_SEC,
    });
  }
  return userError(500, 'SMS delivery failed');
}

/** The log row never blocks the response: a failure is logged and the outcome stands. */
async function record(
  sendLog: SmsSendLog,
  log: Logger,
  payload: SendSmsPayload,
  provider: string,
  status: SmsLogStatus,
  at: Date,
  providerMessageId?: string,
): Promise<void> {
  const entry: SmsLogEntry = { phone: payload.phone, purpose: PURPOSE, provider, status, at };
  if (payload.ip !== undefined) entry.ip = payload.ip;
  if (providerMessageId !== undefined) entry.providerMessageId = providerMessageId;
  try {
    await sendLog.record(entry);
  } catch (error) {
    log.log('error', 'sms_send_log_failed', {
      phone_masked: maskPhone(payload.phone),
      provider,
      status,
      error: describe(error),
    });
  }
}

function ok(): HookResponse {
  return { status: 200, headers: {}, body: {} };
}

/** Delivered to the end user by Auth as `http_code` + `message` (hookserrors.Check). */
function userError(httpCode: number, message: string): HookResponse {
  return { status: 200, headers: {}, body: { error: { http_code: httpCode, message } } };
}

/** Request-level failure; Auth turns it into a generic 500 (or retries 503 with retry-after). */
function requestError(
  status: number,
  message: string,
  headers: Record<string, string> = {},
): HookResponse {
  return { status, headers, body: { error: { http_code: status, message } } };
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
