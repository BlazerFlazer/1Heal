/**
 * Decorative QR-like pattern for the member pass. It is NOT a scannable or verifiable code: the
 * signed rotating QR arrives with the check-in milestone (PLAN M5). The pattern changes every
 * minute so the pass already behaves like the real thing visually.
 */
export const QR_MODULES = 21;
const FINDER = 7;

/** FNV-1a 32-bit hash. */
export function hash32(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

/** xorshift32 stream seeded by the hash. */
function random(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function inFinder(row: number, col: number): boolean {
  const near = (value: number, start: number) => value >= start && value < start + FINDER + 1;
  const last = QR_MODULES - FINDER - 1;
  return (
    (near(row, 0) && near(col, 0)) ||
    (near(row, 0) && near(col, last)) ||
    (near(row, last) && near(col, 0))
  );
}

/** Dark modules as [row, col] pairs; the three finder squares are drawn separately. */
export function qrModules(userId: string, minute: number): [number, number][] {
  const next = random(hash32(`${userId}:${minute}`));
  const cells: [number, number][] = [];
  for (let row = 0; row < QR_MODULES; row += 1) {
    for (let col = 0; col < QR_MODULES; col += 1) {
      if (!inFinder(row, col) && next() < 0.48) cells.push([row, col]);
    }
  }
  return cells;
}

/** Top-left module of each finder square. */
export const FINDER_ORIGINS: readonly [number, number][] = [
  [0, 0],
  [0, QR_MODULES - FINDER],
  [QR_MODULES - FINDER, 0],
];
export const FINDER_SIZE = FINDER;

/** Short, human-readable member number derived from the user id ("4F7A-21C9"). */
export function memberShortId(userId: string): string {
  const hex = hash32(userId).toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}
