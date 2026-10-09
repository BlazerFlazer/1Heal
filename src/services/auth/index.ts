import { getSupabaseClient } from '@/services/api/supabaseClient';
import { env } from '@/shared/config/env';

import type { AuthService } from './AuthService';
import { MockAuthService } from './MockAuthService';
import { SupabaseAuthService } from './SupabaseAuthService';

export type { AuthService, AuthStateListener } from './AuthService';
export { maskPhoneE164 } from './maskPhone';
export {
  MOCK_ADMIN_PHONE,
  MOCK_OTP_CODE,
  MOCK_OTP_LIMITS,
  MOCK_PARTNER_SUFFIX,
  MockAuthService,
} from './MockAuthService';
export {
  SUPABASE_OTP_EXPIRES_IN_SEC,
  SUPABASE_OTP_RESEND_AFTER_SEC,
  SupabaseAuthService,
} from './SupabaseAuthService';
export * from './types';

let instance: AuthService | undefined;

/** The app-wide auth service, chosen once from `EXPO_PUBLIC_AUTH_PROVIDER`. */
export function getAuthService(): AuthService {
  instance ??=
    env.AUTH_PROVIDER === 'supabase'
      ? new SupabaseAuthService(getSupabaseClient().auth)
      : new MockAuthService();
  return instance;
}
