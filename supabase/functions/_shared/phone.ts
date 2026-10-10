/** Phone helpers for the Edge Functions (no dependency on `src/`, which Deno cannot import). */

/** E.164: "+" followed by 7 to 15 digits, no leading zero. */
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

/** Uzbekistan mobile numbers as the app stores them: +998 and 9 digits. */
export const UZ_E164_PATTERN = /^\+998\d{9}$/;

/**
 * Normalises what Supabase Auth hands over ("998901234567" as stored in auth.users, or
 * "+998 90 123 45 67") to E.164 with the plus sign. Returns null for anything else.
 */
export function normalizeE164(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, '');
  if (compact.length === 0) return null;
  const candidate = compact.startsWith('+') ? compact : `+${compact}`;
  return E164_PATTERN.test(candidate) ? candidate : null;
}

/** Digits only, the form providers such as Eskiz expect ("998901234567"). */
export function e164ToDigits(phoneE164: string): string {
  return phoneE164.replace(/^\+/, '');
}

/** "+998901234567" → "+99890*****67": enough to correlate log lines, not enough to dial. */
export function maskPhone(phone: string): string {
  const normalized = normalizeE164(phone) ?? phone;
  const headLength = Math.min(6, Math.max(0, normalized.length - 4));
  const head = normalized.slice(0, headLength);
  const tail = normalized.slice(-2);
  const hidden = Math.max(0, normalized.length - head.length - tail.length);
  return `${head}${'*'.repeat(hidden)}${tail}`;
}
