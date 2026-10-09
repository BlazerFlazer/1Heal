import { maskUzPhone, toUzNationalDigits, UZ_COUNTRY_CODE } from '@/shared/utils/phone';

const PREFIX = `+${UZ_COUNTRY_CODE}`;

/**
 * Next value of the controlled phone field: the progressive "+998 XX XXX XX XX" mask, except that
 * deleting back into the country code empties the field so the placeholder shows again instead
 * of a "+998" the user cannot get rid of.
 */
export function nextPhoneValue(text: string): string {
  if (toUzNationalDigits(text).length === 0 && !text.startsWith(PREFIX)) {
    return '';
  }
  return maskUzPhone(text);
}
