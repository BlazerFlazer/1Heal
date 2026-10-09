/** WCAG 2.x contrast math. Pure; used by tests and by anything that needs to pick a readable color. */

export const AA_NORMAL_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
export const AA_NON_TEXT = 3;

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export type Rgb = { r: number; g: number; b: number };

/** Parses `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`. Alpha is ignored (contrast assumes opaque). */
export function parseHex(hex: string): Rgb {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const short = hex.length <= 5;
  const digits = short
    ? hex
        .slice(1)
        .split('')
        .map((d) => d + d)
        .join('')
    : hex.slice(1);
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
}

function linearChannel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.x (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

/** Contrast ratio between two colors, 1..21. Order does not matter. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export type MeetsAAOptions = {
  /** Large text (>= 18pt, or >= 14pt bold) only needs 3:1. */
  large?: boolean;
};

/** True when `fg` on `bg` passes WCAG AA for text. */
export function meetsAA(fg: string, bg: string, options: MeetsAAOptions = {}): boolean {
  return contrastRatio(fg, bg) >= (options.large ? AA_LARGE_TEXT : AA_NORMAL_TEXT);
}
