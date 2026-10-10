import {
  DEFAULT_SMS_LOCALE,
  isSmsLocale,
  parseSendSmsPayload,
} from '../../functions/_shared/hooks/sendSmsPayload';
import { maskPhone, normalizeE164 } from '../../functions/_shared/phone';

function body(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    user: { id: 'f2d1c7e4-1a2b-4c3d-9e8f-0a1b2c3d4e5f', phone: '998901234567' },
    sms: { otp: '123456' },
    metadata: { ip_address: '203.0.113.9' },
    ...overrides,
  });
}

describe('parseSendSmsPayload', () => {
  test('accepts the Supabase payload with the phone as stored in auth.users (no plus)', () => {
    expect(parseSendSmsPayload(body())).toEqual({
      ok: true,
      payload: {
        userId: 'f2d1c7e4-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
        phone: '+998901234567',
        otp: '123456',
        locale: 'ru',
        ip: '203.0.113.9',
      },
    });
  });

  test('accepts an E.164 phone with the plus and prefers sms.phone when present', () => {
    const result = parseSendSmsPayload(
      body({
        user: { id: 'u', phone: '+998901234567' },
        sms: { otp: '654321', phone: '+998937654321', sms_type: 'phone_change' },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.phone).toBe('+998937654321');
    expect(result.payload.smsType).toBe('phone_change');
  });

  test('reads the locale from user_metadata, then raw_user_meta_data, defaulting to ru', () => {
    const fromMetadata = parseSendSmsPayload(
      body({ user: { id: 'u', phone: '998901234567', user_metadata: { locale: 'uz' } } }),
    );
    const fromRaw = parseSendSmsPayload(
      body({ user: { id: 'u', phone: '998901234567', raw_user_meta_data: { locale: 'en' } } }),
    );
    const unsupported = parseSendSmsPayload(
      body({ user: { id: 'u', phone: '998901234567', user_metadata: { locale: 'de' } } }),
    );
    expect(fromMetadata.ok && fromMetadata.payload.locale).toBe('uz');
    expect(fromRaw.ok && fromRaw.payload.locale).toBe('en');
    expect(unsupported.ok && unsupported.payload.locale).toBe(DEFAULT_SMS_LOCALE);
  });

  test('ignores a metadata.ip_address that is empty or not address-like', () => {
    for (const ip_address of ['', '   ', 'a'.repeat(65), 'with space']) {
      const result = parseSendSmsPayload(body({ metadata: { ip_address } }));
      expect(result.ok && result.payload.ip).toBeUndefined();
    }
    const noMetadata = parseSendSmsPayload(body({ metadata: undefined }));
    expect(noMetadata.ok && noMetadata.payload.ip).toBeUndefined();
  });

  test.each([
    ['not json', '{', 'body is not valid JSON'],
    ['an array', '[]', 'body must be a JSON object'],
    ['no user', body({ user: null }), 'user is missing'],
    ['no user id', body({ user: { phone: '998901234567' } }), 'user.id is missing'],
    ['no otp', body({ sms: {} }), 'sms.otp must be 4 to 10 digits'],
    ['otp with letters', body({ sms: { otp: '12a456' } }), 'sms.otp must be 4 to 10 digits'],
    ['no phone', body({ user: { id: 'u' } }), 'user.phone is not an E.164 number'],
    [
      'bad phone',
      body({ user: { id: 'u', phone: '0901234567' } }),
      'user.phone is not an E.164 number',
    ],
  ])('rejects %s', (_label, raw, error) => {
    expect(parseSendSmsPayload(raw)).toEqual({ ok: false, error });
  });

  test('isSmsLocale narrows to the three app locales', () => {
    expect(['ru', 'uz', 'en'].every(isSmsLocale)).toBe(true);
    expect(isSmsLocale('kk')).toBe(false);
  });
});

describe('phone helpers', () => {
  test('normalizeE164 accepts stored digits, plus form and spaced input', () => {
    expect(normalizeE164('998901234567')).toBe('+998901234567');
    expect(normalizeE164('+998 90 123-45-67')).toBe('+998901234567');
    expect(normalizeE164('+1 (333) 363-128')).toBe('+1333363128');
    expect(normalizeE164('0901234567')).toBeNull();
    expect(normalizeE164('')).toBeNull();
    expect(normalizeE164('abc')).toBeNull();
  });

  test('maskPhone keeps the country code, operator and the last two digits', () => {
    expect(maskPhone('+998901234567')).toBe('+99890*****67');
    expect(maskPhone('998901234567')).toBe('+99890*****67');
    expect(maskPhone('+1333363128')).toBe('+13333***28');
    expect(maskPhone('x')).toBe('x');
  });
});
