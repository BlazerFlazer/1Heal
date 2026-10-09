import type { Session as SupabaseSession, SupabaseClient } from '@supabase/supabase-js';

import type { JsonStorage } from '@/services/storage/jsonStorage';
import { secureStorage } from '@/services/storage/secureStorage';
import { parseUzPhone } from '@/shared/utils/phone';

import type { AuthService, AuthStateListener } from './AuthService';
import { getOrCreateDeviceId } from './deviceId';
import { maskPhoneE164 } from './maskPhone';
import { type AuthPhase, mapSupabaseAuthError } from './supabaseErrors';
import { toSession } from './supabaseSession';
import { AuthError, type OtpRequestResult, type Session } from './types';

/** The slice of `supabase.auth` this service needs; tests inject a fake. */
export type SupabaseAuthApi = Pick<
  SupabaseClient['auth'],
  'signInWithOtp' | 'verifyOtp' | 'getSession' | 'refreshSession' | 'signOut' | 'onAuthStateChange'
>;

/**
 * What the UI shows for resend/expiry. They must match `[auth.sms]` in supabase/config.toml (M2):
 * the server, not these numbers, enforces the limits.
 */
export const SUPABASE_OTP_RESEND_AFTER_SEC = 60;
export const SUPABASE_OTP_EXPIRES_IN_SEC = 600;

/** Error codes for which the local session is gone for good, so refresh yields `null`. */
const SESSION_GONE_CODES = new Set<AuthError['code']>([
  'INVALID_CODE',
  'CODE_EXPIRED',
  'INVALID_PHONE',
  'UNKNOWN',
]);

export class SupabaseAuthService implements AuthService {
  private readonly auth: SupabaseAuthApi;
  private readonly storage: JsonStorage;
  private deviceId: string | null = null;

  constructor(auth: SupabaseAuthApi, storage: JsonStorage = secureStorage) {
    this.auth = auth;
    this.storage = storage;
  }

  async requestOtp(phoneE164: string): Promise<OtpRequestResult> {
    const phone = normalizePhone(phoneE164);
    const { error } = await guard(() => this.auth.signInWithOtp({ phone }), 'request');
    if (error) throw mapSupabaseAuthError(error, 'request');
    return {
      resendAfterSec: SUPABASE_OTP_RESEND_AFTER_SEC,
      expiresInSec: SUPABASE_OTP_EXPIRES_IN_SEC,
      maskedPhone: maskPhoneE164(phone),
    };
  }

  async verifyOtp(phoneE164: string, code: string): Promise<Session> {
    const phone = normalizePhone(phoneE164);
    const { data, error } = await guard(
      () => this.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' }),
      'verify',
    );
    if (error) throw mapSupabaseAuthError(error, 'verify');
    if (!data.session) {
      throw new AuthError('UNKNOWN', { message: 'verifyOtp returned no session' });
    }
    return this.toAppSession(data.session);
  }

  async restoreSession(): Promise<Session | null> {
    const { data, error } = await guard(() => this.auth.getSession(), 'request');
    if (error || !data.session) return null;
    return this.toAppSession(data.session);
  }

  async refreshSession(): Promise<Session | null> {
    const { data, error } = await guard(() => this.auth.refreshSession(), 'request');
    if (error) {
      const mapped = mapSupabaseAuthError(error, 'request');
      if (SESSION_GONE_CODES.has(mapped.code)) return null;
      throw mapped;
    }
    return data.session ? this.toAppSession(data.session) : null;
  }

  /** Revokes the refresh token server-side; offline, the local session is still dropped. */
  async signOut(): Promise<void> {
    const { error } = await guard(() => this.auth.signOut({ scope: 'global' }), 'request');
    if (error) {
      const local = await guard(() => this.auth.signOut({ scope: 'local' }), 'request');
      if (local.error) throw mapSupabaseAuthError(local.error, 'request');
    }
  }

  onAuthStateChange(callback: AuthStateListener): () => void {
    const { data } = this.auth.onAuthStateChange((_event, session) => {
      void this.notify(session, callback);
    });
    return () => data.subscription.unsubscribe();
  }

  private async notify(session: SupabaseSession | null, callback: AuthStateListener) {
    if (!session) {
      callback(null);
      return;
    }
    try {
      callback(await this.toAppSession(session));
    } catch {
      // A session this app cannot represent (no Uzbek phone) counts as signed out.
      callback(null);
    }
  }

  private async toAppSession(session: SupabaseSession): Promise<Session> {
    this.deviceId ??= await getOrCreateDeviceId(this.storage);
    return toSession(session, this.deviceId);
  }
}

/** supabase-js returns `{ error }` for API failures but can still throw (e.g. fetch itself). */
async function guard<T>(call: () => Promise<T>, phase: AuthPhase): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw mapSupabaseAuthError(error, phase);
  }
}

function normalizePhone(input: string): string {
  const parsed = parseUzPhone(input);
  if (!parsed) throw new AuthError('INVALID_PHONE');
  return parsed.e164;
}
