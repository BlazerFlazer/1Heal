/**
 * Stable identifiers. Every seeded row id is derived from a readable key (e.g. "venue",
 * "lotus-yoga-shaykhantahur"), so ids survive regeneration and re-running the seed is a no-op
 * (`on conflict do nothing`). Format: RFC 4122 variant, version 5 bits (name-based).
 */
import { createHash } from 'node:crypto';

const NAMESPACE = 'seed.v1';

export function seedUuid(...parts) {
  const hex = createHash('sha256')
    .update([NAMESPACE, ...parts].join(':'))
    .digest('hex');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

const BASE83 =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function encode83(value, length) {
  let out = '';
  for (let i = 1; i <= length; i += 1) {
    out += BASE83[Math.floor(value / 83 ** (length - i)) % 83];
  }
  return out;
}

/**
 * A valid 4x3-component BlurHash (28 chars) whose average colour is `rgb` with soft random
 * variation, used as the image placeholder of seeded photos.
 */
export function placeholderBlurhash(rng, [r, g, b]) {
  const sizeFlag = 4 - 1 + (3 - 1) * 9;
  let ac = '';
  for (let i = 0; i < 11; i += 1) {
    ac += encode83(rng.int(6, 12) * 19 * 19 + rng.int(6, 12) * 19 + rng.int(6, 12), 2);
  }
  return (
    encode83(sizeFlag, 1) + encode83(rng.int(6, 12), 1) + encode83((r << 16) + (g << 8) + b, 4) + ac
  );
}
