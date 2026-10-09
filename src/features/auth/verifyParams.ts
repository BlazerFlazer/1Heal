import { z } from 'zod';

import { phoneE164Schema } from '@/services/auth/types';

const WHOLE_SECONDS = /^\d+$/;

/** Params the phone screen passes to `/(public)/verify`; they also arrive untyped via deep links. */
export const verifyParamsSchema = z.object({
  phone: phoneE164Schema,
  resendAfterSec: z.string().regex(WHOLE_SECONDS).transform(Number).optional(),
});

export type VerifyParams = z.infer<typeof verifyParamsSchema>;

/** Only a well-formed E.164 phone opens the code screen; anything else is a broken link. */
export function parseVerifyParams(params: unknown): VerifyParams | null {
  const result = verifyParamsSchema.safeParse(params);
  return result.success ? result.data : null;
}
