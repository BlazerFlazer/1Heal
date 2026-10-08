import { BRAND_NAME, BRAND_SCHEME } from './brand';

describe('brand config', () => {
  it('exposes the brand name once', () => {
    expect(BRAND_NAME).toBe('1Heal');
  });

  it('uses a URL scheme that starts with a letter (RFC 3986)', () => {
    expect(BRAND_SCHEME).toMatch(/^[a-z][a-z0-9+.-]*$/);
  });
});
