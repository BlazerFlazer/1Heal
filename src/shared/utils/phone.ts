/** Two-digit operator codes currently assigned to Uzbek mobile networks. */
export const UZ_MOBILE_PREFIXES = [
  '20',
  '33',
  '50',
  '55',
  '61',
  '62',
  '65',
  '66',
  '67',
  '69',
  '70',
  '71',
  '72',
  '73',
  '74',
  '75',
  '76',
  '77',
  '78',
  '79',
  '88',
  '90',
  '91',
  '93',
  '94',
  '95',
  '97',
  '98',
  '99',
] as const;

export type UzMobilePrefix = (typeof UZ_MOBILE_PREFIXES)[number];

export const UZ_COUNTRY_CODE = '998';

/** Digits after the country code: operator (2) + subscriber (7). */
export const UZ_NATIONAL_LENGTH = 9;

/** Stored form of a parsed number: E.164, "+998XXXXXXXXX". */
export type UzPhone = { e164: string };

const prefixSet: ReadonlySet<string> = new Set(UZ_MOBILE_PREFIXES);

/** Digit group sizes of the display mask "+998 XX XXX XX XX". */
const MASK_GROUPS = [2, 3, 2, 2] as const;

export function isUzMobilePrefix(prefix: string): prefix is UzMobilePrefix {
  return prefixSet.has(prefix);
}

/**
 * Accepts "+998 90 123 45 67", "998901234567", "901234567", "90 123-45-67"
 * (any punctuation). The operator code must be a known mobile prefix.
 */
export function parseUzPhone(input: string): UzPhone | null {
  const digits = input.replace(/\D/g, '');
  let national: string | null = null;
  if (digits.length === UZ_COUNTRY_CODE.length + UZ_NATIONAL_LENGTH) {
    national = digits.startsWith(UZ_COUNTRY_CODE) ? digits.slice(UZ_COUNTRY_CODE.length) : null;
  } else if (digits.length === UZ_NATIONAL_LENGTH) {
    national = digits;
  }
  if (national === null || !isUzMobilePrefix(national.slice(0, 2))) return null;
  return { e164: `+${UZ_COUNTRY_CODE}${national}` };
}

export function isValidUzPhone(input: string): boolean {
  return parseUzPhone(input) !== null;
}

/**
 * The national digits (at most 9) out of whatever the user typed or pasted.
 * Understands its own mask output, so a controlled input can round-trip:
 * "+998 90 1" → "901", "+9989" → "9", "+99" → "" (country code being deleted),
 * "998901234567" → "901234567", "9981234" → "9981234" (a 99-operator number).
 */
export function toUzNationalDigits(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    if (UZ_COUNTRY_CODE.startsWith(digits)) return '';
    if (digits.startsWith(UZ_COUNTRY_CODE)) digits = digits.slice(UZ_COUNTRY_CODE.length);
  } else if (digits.length > UZ_NATIONAL_LENGTH && digits.startsWith(UZ_COUNTRY_CODE)) {
    digits = digits.slice(UZ_COUNTRY_CODE.length);
  }
  return digits.slice(0, UZ_NATIONAL_LENGTH);
}

/**
 * Progressive input mask: "" → "+998", "9012" → "+998 90 12",
 * "901234567" → "+998 90 123 45 67". Feed it the raw text of a controlled input.
 */
export function maskUzPhone(digitsTyped: string): string {
  const national = toUzNationalDigits(digitsTyped);
  const groups: string[] = [];
  let offset = 0;
  for (const size of MASK_GROUPS) {
    if (offset >= national.length) break;
    groups.push(national.slice(offset, offset + size));
    offset += size;
  }
  return [`+${UZ_COUNTRY_CODE}`, ...groups].join(' ');
}
