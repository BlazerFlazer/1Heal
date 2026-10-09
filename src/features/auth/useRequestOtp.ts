import { useMutation } from '@tanstack/react-query';

import { getAuthService, type OtpRequestResult } from '@/services/auth';

/** Requests an SMS code for an E.164 number; rejects with `AuthError`. */
export function useRequestOtp() {
  return useMutation<OtpRequestResult, Error, string>({
    mutationFn: (phoneE164) => getAuthService().requestOtp(phoneE164),
  });
}
