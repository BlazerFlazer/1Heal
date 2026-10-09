import { z } from 'zod';

import { parseUzPhone } from '@/shared/utils/phone';

/** i18n key rendered under the field when the text is not a valid Uzbek mobile number. */
export const PHONE_INVALID_MESSAGE = 'errors.validation.phone';

/** Sign-in form: the field holds the masked text, the parsed output is the E.164 number. */
export const phoneFormSchema = z.object({
  phone: z.string().transform((value, ctx) => {
    const parsed = parseUzPhone(value);
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: PHONE_INVALID_MESSAGE });
      return z.NEVER;
    }
    return parsed.e164;
  }),
});

export type PhoneFormInput = z.input<typeof phoneFormSchema>;
export type PhoneFormOutput = z.output<typeof phoneFormSchema>;
