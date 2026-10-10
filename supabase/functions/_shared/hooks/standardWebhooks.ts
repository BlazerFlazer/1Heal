/**
 * Standard Webhooks signature verification (https://github.com/standard-webhooks/standard-webhooks,
 * spec/standard-webhooks.md), the scheme Supabase Auth uses for HTTP hooks.
 *
 *   signed content  = "<webhook-id>.<webhook-timestamp>.<raw body>"
 *   webhook-signature = space separated "v1,<base64(HMAC-SHA256(secret, signed content))>"
 *   secret          = "whsec_<base64>" ("v1,whsec_<base64>" as Supabase stores it)
 *
 * Web Crypto only (Deno and Node). The comparison is constant time.
 */
export interface HeaderReader {
  get(name: string): string | null;
}

/** Replay window recommended by the spec for the `webhook-timestamp` (seconds). */
export const SIGNATURE_TOLERANCE_SEC = 300;

const VERSION = 'v1';
const SECRET_PREFIX = 'whsec_';

export type SignatureFailure =
  | 'missing_headers'
  | 'invalid_timestamp'
  | 'timestamp_out_of_tolerance'
  | 'invalid_secret'
  | 'no_matching_signature';

export type SignatureVerification = { ok: true } | { ok: false; reason: SignatureFailure };

export interface VerifyInput {
  /** "v1,whsec_<base64>"; several secrets separated by "|" while rotating. */
  secret: string;
  headers: HeaderReader;
  /** The raw request body, byte for byte as received. */
  body: string;
  /** Unix seconds; defaults to the wall clock. */
  nowSec?: number;
  toleranceSec?: number;
}

/** Decodes every usable secret in `value`; unknown formats are skipped. */
export function parseWebhookSecrets(value: string): Uint8Array[] {
  const keys: Uint8Array[] = [];
  for (const part of value.split('|')) {
    let secret = part.trim();
    if (secret.startsWith(`${VERSION},`)) secret = secret.slice(VERSION.length + 1);
    if (!secret.startsWith(SECRET_PREFIX)) continue;
    const key = decodeBase64(secret.slice(SECRET_PREFIX.length));
    if (key !== null && key.length > 0) keys.push(key);
  }
  return keys;
}

/** The base64 `v1` signature for a message (used by tests and by anyone signing on our behalf). */
export async function signStandardWebhook(
  key: Uint8Array,
  msgId: string,
  timestampSec: number,
  body: string,
): Promise<string> {
  return encodeBase64(await hmacSha256(key, `${msgId}.${timestampSec}.${body}`));
}

export async function verifyStandardWebhook(input: VerifyInput): Promise<SignatureVerification> {
  const msgId = input.headers.get('webhook-id');
  const timestampHeader = input.headers.get('webhook-timestamp');
  const signatureHeader = input.headers.get('webhook-signature');
  if (!msgId || !timestampHeader || !signatureHeader) {
    return { ok: false, reason: 'missing_headers' };
  }
  const timestampText = timestampHeader.trim();
  if (!/^\d{1,12}$/.test(timestampText)) return { ok: false, reason: 'invalid_timestamp' };
  const timestamp = Number(timestampText);
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSec ?? SIGNATURE_TOLERANCE_SEC;
  if (Math.abs(now - timestamp) > tolerance) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const keys = parseWebhookSecrets(input.secret);
  if (keys.length === 0) return { ok: false, reason: 'invalid_secret' };
  const candidates = parseSignatureHeader(signatureHeader);
  if (candidates.length === 0) return { ok: false, reason: 'no_matching_signature' };

  const signedContent = `${msgId}.${timestamp}.${input.body}`;
  for (const key of keys) {
    const expected = await hmacSha256(key, signedContent);
    for (const candidate of candidates) {
      if (constantTimeEqual(expected, candidate)) return { ok: true };
    }
  }
  return { ok: false, reason: 'no_matching_signature' };
}

/**
 * "v1,abc= v1,def=" per the spec; Supabase Auth joins several signatures with ", ", so a
 * trailing comma on a token is tolerated. Only symmetric `v1` entries are considered.
 */
function parseSignatureHeader(header: string): Uint8Array[] {
  const signatures: Uint8Array[] = [];
  for (const token of header.trim().split(/\s+/)) {
    const entry = token.replace(/,+$/, '');
    const separator = entry.indexOf(',');
    if (separator === -1) continue;
    if (entry.slice(0, separator) !== VERSION) continue;
    const bytes = decodeBase64(entry.slice(separator + 1));
    if (bytes !== null && bytes.length > 0) signatures.push(bytes);
  }
  return signatures;
}

async function hmacSha256(key: Uint8Array, content: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    // A copy backed by a plain ArrayBuffer, which is what BufferSource accepts.
    new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(content));
  return new Uint8Array(mac);
}

/** Compares every byte regardless of where the first difference is. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export function decodeBase64(text: string): Uint8Array | null {
  const compact = text.replace(/\s+/g, '');
  if (compact.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) return null;
  try {
    const binary = atob(compact);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
