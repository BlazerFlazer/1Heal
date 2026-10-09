import { useMutation } from '@tanstack/react-query';

import { getAuthService, type Session } from '@/services/auth';

export type VerifyOtpInput = { phoneE164: string; code: string };

/** Exchanges a code for a session; rejects with `AuthError`. The caller stores the session. */
export function useVerifyOtp() {
  return useMutation<Session, Error, VerifyOtpInput>({
    mutationFn: ({ phoneE164, code }) => getAuthService().verifyOtp(phoneE164, code),
  });
}
