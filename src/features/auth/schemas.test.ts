import { nextPhoneValue } from './phoneField';
import { PHONE_INVALID_MESSAGE, phoneFormSchema } from './schemas';
import { parseVerifyParams } from './verifyParams';

describe('phoneFormSchema', () => {
  it('outputs the E.164 number for every accepted input form', () => {
    expect(phoneFormSchema.parse({ phone: '+998 90 123 45 67' })).toEqual({
      phone: '+998901234567',
    });
    expect(phoneFormSchema.parse({ phone: '901234567' })).toEqual({ phone: '+998901234567' });
    expect(phoneFormSchema.parse({ phone: '998 33 000-00-00' })).toEqual({
      phone: '+998330000000',
    });
  });

  it('rejects unknown operator codes and incomplete numbers with the i18n key', () => {
    const unknownOperator = phoneFormSchema.safeParse({ phone: '+998 12 345 67 89' });
    expect(unknownOperator.success).toBe(false);
    if (!unknownOperator.success) {
      expect(unknownOperator.error.issues[0]?.message).toBe(PHONE_INVALID_MESSAGE);
      expect(unknownOperator.error.issues[0]?.path).toEqual(['phone']);
    }
    expect(phoneFormSchema.safeParse({ phone: '+998 90 123' }).success).toBe(false);
    expect(phoneFormSchema.safeParse({ phone: '' }).success).toBe(false);
  });
});

describe('nextPhoneValue', () => {
  it.each([
    ['9', '+998 9'],
    ['90123', '+998 90 123'],
    ['998901234567', '+998 90 123 45 67'],
    ['+998 90 123 45 67 89', '+998 90 123 45 67'],
    ['+998 90 1', '+998 90 1'],
    ['+998 ', '+998'],
    ['+998', '+998'],
    ['+99', ''],
    ['', ''],
    ['abc', ''],
  ])('"%s" becomes "%s"', (input, expected) => {
    expect(nextPhoneValue(input)).toBe(expected);
  });
});

describe('parseVerifyParams', () => {
  it('accepts an E.164 phone with an optional whole-second resend delay', () => {
    expect(parseVerifyParams({ phone: '+998901234567' })).toEqual({ phone: '+998901234567' });
    expect(parseVerifyParams({ phone: '+998901234567', resendAfterSec: '30' })).toEqual({
      phone: '+998901234567',
      resendAfterSec: 30,
    });
  });

  it('rejects missing, formatted or repeated phones and malformed delays', () => {
    expect(parseVerifyParams({})).toBeNull();
    expect(parseVerifyParams({ phone: '+998 90 123 45 67' })).toBeNull();
    expect(parseVerifyParams({ phone: ['+998901234567', '+998901234568'] })).toBeNull();
    expect(parseVerifyParams({ phone: '+998901234567', resendAfterSec: '-5' })).toBeNull();
    expect(parseVerifyParams({ phone: '+998901234567', resendAfterSec: '1.5' })).toBeNull();
    expect(parseVerifyParams(undefined)).toBeNull();
  });
});
