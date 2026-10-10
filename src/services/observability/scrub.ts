import type { Breadcrumb, Event } from '@sentry/react-native';

/**
 * Personal-data scrubbing for everything that leaves the device for Sentry (ADR-022).
 * Health-adjacent data and Uzbek phone numbers must never reach a third-party processor, so the
 * SDK runs with `sendDefaultPii: false` and every event, transaction and breadcrumb passes here.
 */

export const REDACTED = '[redacted]';

/**
 * Object keys whose values are always dropped, whatever they contain. Anchored where a bare
 * substring would hit SDK fields (`span_id` contains "pan", `error_code` is diagnostic).
 */
const SENSITIVE_KEY =
  /phone|otp|token|secret|password|passwd|authorization|cookie|^code$|^pan$|card_?number|full_?name/i;

const PATTERNS: readonly RegExp[] = [
  // JWTs (Supabase access tokens) and bearer credentials.
  /eyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  /bearer\s+[\w.~+/-]+=*/gi,
  // Uzbek phone numbers in any common shape: +998 90 123 45 67, 998901234567, (90) 123-45-67.
  /\+?998[\s -]*\(?\d{2}\)?[\s -]*\d{3}[\s -]*\d{2}[\s -]*\d{2}/g,
  /\(?\b\d{2}\)?[\s -]\d{3}[\s -]\d{2}[\s -]\d{2}\b/g,
  // E-mail addresses.
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
];

export function scrubText(value: string): string {
  return PATTERNS.reduce((text, pattern) => text.replace(pattern, REDACTED), value);
}

const MAX_DEPTH = 6;

/** Deep copy with sensitive keys dropped and string values scrubbed. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object' || depth >= MAX_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(inner, depth + 1);
  }
  return out;
}

function scrubRecord<T>(record: T | undefined): T | undefined {
  return record === undefined ? undefined : (scrubValue(record) as T);
}

/** Drops the query string and fragment of a URL: they routinely carry phones and tokens. */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

export function scrubEvent<E extends Event>(event: E): E {
  const scrubbed: E = { ...event };
  if (scrubbed.message !== undefined) scrubbed.message = scrubText(scrubbed.message);
  if (scrubbed.transaction !== undefined) scrubbed.transaction = stripQuery(scrubbed.transaction);
  if (scrubbed.exception?.values) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((exception) => ({
        ...exception,
        value: exception.value === undefined ? undefined : scrubText(exception.value),
      })),
    };
  }
  if (scrubbed.request) {
    const { url, headers, data } = scrubbed.request;
    scrubbed.request = {
      ...scrubbed.request,
      url: url === undefined ? undefined : stripQuery(url),
      query_string: undefined,
      cookies: undefined,
      headers: scrubRecord(headers),
      data: scrubRecord(data),
    };
  }
  scrubbed.extra = scrubRecord(scrubbed.extra);
  scrubbed.contexts = scrubRecord(scrubbed.contexts);
  scrubbed.breadcrumbs = scrubbed.breadcrumbs?.map(scrubBreadcrumb);
  // Only the internal UUID identifies a user; never a phone, name or IP address.
  scrubbed.user = scrubbed.user?.id === undefined ? undefined : { id: scrubbed.user.id };
  return scrubbed;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const data = breadcrumb.data === undefined ? undefined : { ...breadcrumb.data };
  if (data && typeof data.url === 'string') data.url = stripQuery(data.url);
  return {
    ...breadcrumb,
    message: breadcrumb.message === undefined ? undefined : scrubText(breadcrumb.message),
    data: scrubRecord(data),
  };
}
