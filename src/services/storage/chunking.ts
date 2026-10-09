/** Byte-aware string splitting for stores with a per-value size limit (expo-secure-store: 2 KB). */

function codePointBytes(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    bytes += codePointBytes(char.codePointAt(0) ?? 0);
  }
  return bytes;
}

/**
 * Splits `text` into pieces of at most `maxBytes` UTF-8 bytes without cutting a code point
 * (surrogate pairs stay together). An empty string yields a single empty chunk.
 */
export function splitByUtf8Bytes(text: string, maxBytes: number): string[] {
  if (!Number.isInteger(maxBytes) || maxBytes < 4) {
    throw new RangeError('maxBytes must be an integer of at least 4');
  }
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of text) {
    const bytes = codePointBytes(char.codePointAt(0) ?? 0);
    if (currentBytes + bytes > maxBytes) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  if (current.length > 0 || chunks.length === 0) {
    chunks.push(current);
  }
  return chunks;
}
