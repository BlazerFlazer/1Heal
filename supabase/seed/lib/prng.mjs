/**
 * Deterministic randomness for the seed generator. Same seed -> same seed.sql, byte for byte.
 * mulberry32 core; `fork(label)` derives an independent stream so that changing one area of the
 * generator does not reshuffle every other area.
 */

/** 32-bit FNV-1a hash of a string. */
export function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    next,
    /** Integer in [min, max], both inclusive. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (list) => {
      if (list.length === 0) throw new Error('prng.pick: empty list');
      return list[Math.floor(next() * list.length)];
    },
    /** Picks by weight; `weightOf(item)` must be >= 0 and at least one weight > 0. */
    weighted: (list, weightOf) => {
      const weights = list.map(weightOf);
      const total = weights.reduce((sum, w) => sum + w, 0);
      if (!(total > 0)) throw new Error('prng.weighted: no positive weight');
      let roll = next() * total;
      for (let i = 0; i < list.length; i += 1) {
        roll -= weights[i];
        if (roll < 0) return list[i];
      }
      return list[list.length - 1];
    },
    shuffle: (list) => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    sample: (list, count) => rng.shuffle(list).slice(0, count),
    /** Lower-case hex string of `length` characters. */
    hex: (length) => {
      let out = '';
      while (out.length < length) out += Math.floor(next() * 16).toString(16);
      return out;
    },
    digits: (length) => {
      let out = '';
      while (out.length < length) out += String(Math.floor(next() * 10));
      return out;
    },
    fork: (label) => createRng(hash32(`${seed}:${label}`)),
  };
  return rng;
}
