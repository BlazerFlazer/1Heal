import { splitByUtf8Bytes, utf8ByteLength } from './chunking';

describe('utf8ByteLength', () => {
  it('counts ASCII, Cyrillic and emoji correctly', () => {
    expect(utf8ByteLength('')).toBe(0);
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('Ташкент')).toBe(14);
    expect(utf8ByteLength('oʻzbek')).toBe(7);
    expect(utf8ByteLength('🏋️')).toBe(7);
  });
});

describe('splitByUtf8Bytes', () => {
  it('returns a single chunk when the text fits', () => {
    expect(splitByUtf8Bytes('hello', 10)).toEqual(['hello']);
    expect(splitByUtf8Bytes('', 10)).toEqual(['']);
  });

  it('never exceeds the byte budget and never cuts a code point', () => {
    const text = 'Ташкент 🏋️ gym 2026 '.repeat(50);
    const chunks = splitByUtf8Bytes(text, 16);
    expect(chunks.join('')).toBe(text);
    for (const chunk of chunks) {
      expect(utf8ByteLength(chunk)).toBeLessThanOrEqual(16);
      expect(chunk).not.toMatch(/[\uD800-\uDBFF]$/);
    }
  });

  it('rejects budgets smaller than one code point', () => {
    expect(() => splitByUtf8Bytes('x', 3)).toThrow(RangeError);
    expect(() => splitByUtf8Bytes('x', 4.5)).toThrow(RangeError);
  });
});
