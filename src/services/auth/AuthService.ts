import type { OtpRequestResult, Session } from './types';

export type AuthStateListener = (session: Session | null) => void;

/**
 * Phone + OTP authentication. Implementations: `MockAuthService` (dev) and `SupabaseAuthService`.
 * Every method rejects with `AuthError`; feature code never sees provider-specific errors.
 */
export interface AuthService {
  requestOtp(phoneE164: string): Promise<OtpRequestResult>;
  verifyOtp(phoneE164: string, code: string): Promise<Session>;
  /** The persisted session, refreshed when expired; `null` when signed out. */
  restoreSession(): Promise<Session | null>;
  /** Rotates tokens; `null` when there is no session to refresh. */
  refreshSession(): Promise<Session | null>;
  signOut(): Promise<void>;
  /** Fires on sign-in, refresh and sign-out. Returns an unsubscribe function. */
  onAuthStateChange(callback: AuthStateListener): () => void;
}
