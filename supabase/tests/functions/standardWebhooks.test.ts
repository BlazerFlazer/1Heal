import {
  constantTimeEqual,
  decodeBase64,
  encodeBase64,
  parseWebhookSecrets,
  signStandardWebhook,
  verifyStandardWebhook,
} from '../../functions/_shared/hooks/standardWebhooks';

const NOW_SEC = 1_760_000_000;
const KEY_A = new TextEncoder().encode('0123456789abcdef0123456789abcdef');
const KEY_B = new TextEncoder().encode('fedcba9876543210fedcba9876543210');
const SECRET_A = `v1,whsec_${encodeBase64(KEY_A)}`;
const SECRET_B = `v1,whsec_${encodeBase64(KEY_B)}`;
const BODY = '{"user":{"id":"u1","phone":"998901234567"},"sms":{"otp":"123456"}}';

async function signedHeaders(
  key: Uint8Array,
  body: string,
  options: { id?: string; timestamp?: number; signature?: string } = {},
): Promise<Headers> {
  const id = options.id ?? 'msg_2fZ8a';
  const timestamp = options.timestamp ?? NOW_SEC;
  const signature = options.signature ?? `v1,${await signStandardWebhook(key, id, timestamp, body)}`;
  return new Headers({
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': signature,
  });
}

describe('Standard Webhooks verification', () => {
  test('accepts a signature made with the configured secret', async () => {
    const headers = await signedHeaders(KEY_A, BODY);
    const result = await verifyStandardWebhook({
      secret: SECRET_A,
      headers,
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(result).toEqual({ ok: true });
  });

  test('rejects a signature made with another secret', async () => {
    const headers = await signedHeaders(KEY_B, BODY);
    const result = await verifyStandardWebhook({
      secret: SECRET_A,
      headers,
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(result).toEqual({ ok: false, reason: 'no_matching_signature' });
  });

  test('rejects a tampered body', async () => {
    const headers = await signedHeaders(KEY_A, BODY);
    const tampered = BODY.replace('123456', '654321');
    const result = await verifyStandardWebhook({
      secret: SECRET_A,
      headers,
      body: tampered,
      nowSec: NOW_SEC,
    });
    expect(result).toEqual({ ok: false, reason: 'no_matching_signature' });
  });

  test('rejects timestamps outside the 5 minute tolerance, past and future', async () => {
    for (const skew of [-301, 301]) {
      const headers = await signedHeaders(KEY_A, BODY, { timestamp: NOW_SEC + skew });
      const result = await verifyStandardWebhook({
        secret: SECRET_A,
        headers,
        body: BODY,
        nowSec: NOW_SEC,
      });
      expect(result).toEqual({ ok: false, reason: 'timestamp_out_of_tolerance' });
    }
    for (const skew of [-300, 300]) {
      const headers = await signedHeaders(KEY_A, BODY, { timestamp: NOW_SEC + skew });
      const result = await verifyStandardWebhook({
        secret: SECRET_A,
        headers,
        body: BODY,
        nowSec: NOW_SEC,
      });
      expect(result).toEqual({ ok: true });
    }
  });

  test('rejects missing headers and malformed timestamps', async () => {
    const missing = await verifyStandardWebhook({
      secret: SECRET_A,
      headers: new Headers({ 'webhook-id': 'x' }),
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(missing).toEqual({ ok: false, reason: 'missing_headers' });

    const headers = await signedHeaders(KEY_A, BODY);
    headers.set('webhook-timestamp', '2026-10-10T10:00:00Z');
    const malformed = await verifyStandardWebhook({
      secret: SECRET_A,
      headers,
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(malformed).toEqual({ ok: false, reason: 'invalid_timestamp' });
  });

  test('rejects a secret that is not whsec_ base64', async () => {
    const headers = await signedHeaders(KEY_A, BODY);
    const result = await verifyStandardWebhook({
      secret: 'not-a-secret',
      headers,
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_secret' });
  });

  test('rotation: several secrets separated by "|" are all accepted', async () => {
    const secret = `${SECRET_A}|${SECRET_B}`;
    for (const key of [KEY_A, KEY_B]) {
      const headers = await signedHeaders(key, BODY);
      const result = await verifyStandardWebhook({ secret, headers, body: BODY, nowSec: NOW_SEC });
      expect(result).toEqual({ ok: true });
    }
    expect(parseWebhookSecrets(secret)).toHaveLength(2);
    expect(parseWebhookSecrets('whsec_')).toHaveLength(0);
  });

  test('accepts several signatures in one header, including the ", " join Supabase Auth uses', async () => {
    const id = 'msg_multi';
    const sigA = await signStandardWebhook(KEY_A, id, NOW_SEC, BODY);
    const sigB = await signStandardWebhook(KEY_B, id, NOW_SEC, BODY);
    const headers = await signedHeaders(KEY_A, BODY, {
      id,
      signature: `v1,${sigB}, v1,${sigA}`,
    });
    const result = await verifyStandardWebhook({
      secret: SECRET_A,
      headers,
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(result).toEqual({ ok: true });

    const asymmetricOnly = await signedHeaders(KEY_A, BODY, { id, signature: `v1a,${sigA}` });
    const rejected = await verifyStandardWebhook({
      secret: SECRET_A,
      headers: asymmetricOnly,
      body: BODY,
      nowSec: NOW_SEC,
    });
    expect(rejected).toEqual({ ok: false, reason: 'no_matching_signature' });
  });

  test('uses the wall clock when nowSec is omitted', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = await signedHeaders(KEY_A, BODY, { timestamp });
    const result = await verifyStandardWebhook({ secret: SECRET_A, headers, body: BODY });
    expect(result).toEqual({ ok: true });
  });
});

describe('byte helpers', () => {
  test('constantTimeEqual compares lengths and every byte', () => {
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false);
    expect(constantTimeEqual(new Uint8Array([]), new Uint8Array([]))).toBe(true);
  });

  test('base64 round-trips and rejects garbage', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
    expect(decodeBase64('not base64!')).toBeNull();
    expect(decodeBase64('')).toBeNull();
  });
});
