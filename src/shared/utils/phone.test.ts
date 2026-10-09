import {
  isUzMobilePrefix,
  isValidUzPhone,
  maskUzPhone,
  parseUzPhone,
  toUzNationalDigits,
  UZ_MOBILE_PREFIXES,
} from './phone';

describe('parseUzPhone', () => {
  it.each([
    ['+998 90 123 45 67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['901234567', '+998901234567'],
    ['90 123-45-67', '+998901234567'],
    ['+998 (33) 123-45-67', '+998331234567'],
    ['  +998991234567  ', '+998991234567'],
  ])('parses %s', (input, e164) => {
    expect(parseUzPhone(input)).toEqual({ e164 });
  });

  it.each([
    ['', 'empty'],
    ['90123456', 'too short'],
    ['9012345678', 'too long'],
    ['+7 901 234 56 78', 'another country, same length'],
    ['+998 12 345 67 89', 'unknown operator code'],
    ['+998 00 123 45 67', 'unknown operator code 00'],
    ['abc', 'no digits'],
  ])('rejects %s (%s)', (input) => {
    expect(parseUzPhone(input)).toBeNull();
  });
});

describe('isValidUzPhone', () => {
  it('mirrors parseUzPhone', () => {
    expect(isValidUzPhone('+998901234567')).toBe(true);
    expect(isValidUzPhone('+998121234567')).toBe(false);
  });
});

describe('isUzMobilePrefix', () => {
  it('accepts every listed prefix and nothing else', () => {
    for (const prefix of UZ_MOBILE_PREFIXES) {
      expect(isUzMobilePrefix(prefix)).toBe(true);
    }
    expect(isUzMobilePrefix('12')).toBe(false);
    expect(isUzMobilePrefix('9')).toBe(false);
    expect(isUzMobilePrefix('900')).toBe(false);
  });

  it('lists each prefix once as two digits', () => {
    expect(new Set(UZ_MOBILE_PREFIXES).size).toBe(UZ_MOBILE_PREFIXES.length);
    for (const prefix of UZ_MOBILE_PREFIXES) {
      expect(prefix).toMatch(/^\d{2}$/);
    }
  });
});

describe('toUzNationalDigits', () => {
  it.each([
    ['', ''],
    ['9', '9'],
    ['901234567', '901234567'],
    ['90 123-45-67', '901234567'],
    ['998901234567', '901234567'],
    ['+998901234567', '901234567'],
    ['+998 90 1', '901'],
    ['+9989', '9'],
    ['+998', ''],
    ['+99', ''],
    ['+', ''],
    ['9981234', '9981234'],
    ['9012345678', '901234567'],
  ])('%p → %p', (input, expected) => {
    expect(toUzNationalDigits(input)).toBe(expected);
  });
});

describe('maskUzPhone', () => {
  it.each([
    ['', '+998'],
    ['9', '+998 9'],
    ['90', '+998 90'],
    ['901', '+998 90 1'],
    ['90123', '+998 90 123'],
    ['901234', '+998 90 123 4'],
    ['9012345', '+998 90 123 45'],
    ['90123456', '+998 90 123 45 6'],
    ['901234567', '+998 90 123 45 67'],
    ['9012345679999', '+998 90 123 45 67'],
  ])('masks %p progressively', (input, expected) => {
    expect(maskUzPhone(input)).toBe(expected);
  });

  it('round-trips its own output from a controlled input', () => {
    const masked = maskUzPhone('901234567');
    expect(maskUzPhone(masked)).toBe(masked);
    expect(maskUzPhone(`${maskUzPhone('9012')}3`)).toBe('+998 90 123');
  });

  it('accepts a pasted full number with or without the plus', () => {
    expect(maskUzPhone('+998 90 123 45 67')).toBe('+998 90 123 45 67');
    expect(maskUzPhone('998901234567')).toBe('+998 90 123 45 67');
  });
});
