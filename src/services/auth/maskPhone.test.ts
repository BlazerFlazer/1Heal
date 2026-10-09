import { maskPhoneE164 } from './maskPhone';

describe('maskPhoneE164', () => {
  it('keeps the operator code and the last two digits', () => {
    expect(maskPhoneE164('+998901234567')).toBe('+998 90 *** ** 67');
    expect(maskPhoneE164('+998330000000')).toBe('+998 33 *** ** 00');
  });

  it('normalises loosely formatted input', () => {
    expect(maskPhoneE164('998 90 123-45-67')).toBe('+998 90 *** ** 67');
  });

  it('returns a fully hidden mask for invalid numbers', () => {
    expect(maskPhoneE164('12345')).toBe('+998 ** *** ** **');
  });
});
