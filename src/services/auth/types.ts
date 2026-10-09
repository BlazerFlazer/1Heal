import { z } from 'zod';

import { localeSchema } from '@/shared/i18n/types';

/** Roles mirror the `user_roles.role` enum; a user may hold several (see docs/PLAN.md). */
export const ROLES = ['member', 'partner', 'admin'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/** Stored phone form: E.164 for Uzbekistan, "+998XXXXXXXXX". */
export const PHONE_E164_PATTERN = /^\+998\d{9}$/;
export const phoneE164Schema = z.string().regex(PHONE_E164_PATTERN);

export const sessionProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  locale: localeSchema.optional(),
});
export type SessionProfile = z.infer<typeof sessionProfileSchema>;

/** The app-level session: provider-agnostic, validated whenever it crosses a storage boundary. */
export const sessionSchema = z.object({
  userId: z.string().min(1),
  phoneE164: phoneE164Schema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** ISO 8601 timestamp. */
  expiresAt: z.iso.datetime(),
  roles: z.array(roleSchema).min(1),
  deviceId: z.string().min(1),
  profile: sessionProfileSchema,
});
export type Session = z.infer<typeof sessionSchema>;

export const otpRequestResultSchema = z.object({
  /** Seconds before the UI may offer "resend". */
  resendAfterSec: z.number().int().nonnegative(),
  /** Seconds the code stays valid. */
  expiresInSec: z.number().int().positive(),
  /** Display form with the middle digits hidden, e.g. "+998 90 *** ** 67". */
  maskedPhone: z.string().min(1),
});
export type OtpRequestResult = z.infer<typeof otpRequestResultSchema>;

export const AUTH_ERROR_CODES = [
  'INVALID_PHONE',
  'INVALID_CODE',
  'CODE_EXPIRED',
  'TOO_MANY_REQUESTS',
  'LOCKED',
  'NETWORK',
  'UNKNOWN',
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export interface AuthErrorOptions {
  /** Present for TOO_MANY_REQUESTS and LOCKED: seconds until the next attempt may succeed. */
  retryAfterSec?: number;
  message?: string;
  cause?: unknown;
}

/** The only error type auth services throw; screens switch on `code`, never on messages. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly retryAfterSec?: number;

  constructor(code: AuthErrorCode, options: AuthErrorOptions = {}) {
    super(options.message ?? code);
    this.name = 'AuthError';
    this.code = code;
    this.retryAfterSec = options.retryAfterSec;
    this.cause = options.cause;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function hasRole(session: Pick<Session, 'roles'> | null, role: Role): boolean {
  return session?.roles.includes(role) ?? false;
}
