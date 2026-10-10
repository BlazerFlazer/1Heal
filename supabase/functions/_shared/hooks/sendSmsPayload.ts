/**
 * Validates the Supabase Auth "Send SMS" hook payload (no zod in Deno by default):
 *   { user: { id, phone, user_metadata?: { locale? } }, sms: { otp, sms_type?, phone? },
 *     metadata?: { ip_address? } }
 * `user.phone` arrives as stored in auth.users (digits, no "+") or in E.164.
 * Source of truth: supabase/auth internal/hooks/v0hooks (SendSMSInput, SMS, Metadata).
 */
import { normalizeE164 } from '../phone';

export const SMS_LOCALES = ['ru', 'uz', 'en'] as const;
export type SmsLocale = (typeof SMS_LOCALES)[number];
export const DEFAULT_SMS_LOCALE: SmsLocale = 'ru';

export interface SendSmsPayload {
  userId: string;
  /** E.164 with the plus sign. */
  phone: string;
  otp: string;
  locale: SmsLocale;
  /** `metadata.ip_address`: the end user's IP as seen by Supabase Auth, when present. */
  ip?: string;
  /** `sms.sms_type` ("sms", "phone_change", ...), informational. */
  smsType?: string;
}

export type ParsedSendSmsPayload =
  { ok: true; payload: SendSmsPayload } | { ok: false; error: string };

const OTP_PATTERN = /^\d{4,10}$/;
const MAX_IP_LENGTH = 64;

export function parseSendSmsPayload(raw: string): ParsedSendSmsPayload {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'body is not valid JSON' };
  }
  if (!isRecord(json)) return { ok: false, error: 'body must be a JSON object' };

  const user = json.user;
  if (!isRecord(user)) return { ok: false, error: 'user is missing' };
  const userId = readString(user, 'id');
  if (userId === undefined) return { ok: false, error: 'user.id is missing' };

  const sms = isRecord(json.sms) ? json.sms : {};
  const otp = readString(sms, 'otp');
  if (otp === undefined || !OTP_PATTERN.test(otp)) {
    return { ok: false, error: 'sms.otp must be 4 to 10 digits' };
  }

  const rawPhone = readString(sms, 'phone') ?? readString(user, 'phone');
  const phone = rawPhone === undefined ? null : normalizeE164(rawPhone);
  if (phone === null) return { ok: false, error: 'user.phone is not an E.164 number' };

  const payload: SendSmsPayload = { userId, phone, otp, locale: readLocale(user) };
  const smsType = readString(sms, 'sms_type');
  if (smsType !== undefined) payload.smsType = smsType;
  const ip = readIp(json.metadata);
  if (ip !== undefined) payload.ip = ip;
  return { ok: true, payload };
}

/** `user_metadata.locale` as GoTrue serialises the user; `raw_user_meta_data` for raw rows. */
function readLocale(user: Record<string, unknown>): SmsLocale {
  for (const key of ['user_metadata', 'raw_user_meta_data']) {
    const metadata = user[key];
    if (!isRecord(metadata)) continue;
    const locale = readString(metadata, 'locale');
    if (locale !== undefined && isSmsLocale(locale)) return locale;
  }
  return DEFAULT_SMS_LOCALE;
}

function readIp(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) return undefined;
  const ip = readString(metadata, 'ip_address')?.trim();
  if (ip === undefined || ip.length === 0 || ip.length > MAX_IP_LENGTH || /\s/.test(ip)) {
    return undefined;
  }
  return ip;
}

export function isSmsLocale(value: string): value is SmsLocale {
  return (SMS_LOCALES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
