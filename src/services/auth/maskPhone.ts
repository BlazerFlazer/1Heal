import { parseUzPhone, UZ_COUNTRY_CODE } from '@/shared/utils/phone';

const UNKNOWN_MASK = `+${UZ_COUNTRY_CODE} ** *** ** **`;

/**
 * "+998901234567" → "+998 90 *** ** 67": enough for the user to recognise the number on the
 * code screen, not enough for a shoulder-surfer to dial it.
 */
export function maskPhoneE164(phoneE164: string): string {
  const parsed = parseUzPhone(phoneE164);
  if (!parsed) return UNKNOWN_MASK;
  const national = parsed.e164.slice(1 + UZ_COUNTRY_CODE.length);
  return `+${UZ_COUNTRY_CODE} ${national.slice(0, 2)} *** ** ${national.slice(7)}`;
}
