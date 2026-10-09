import { AA_NON_TEXT, contrastRatio, meetsAA, parseHex, relativeLuminance } from './contrast';
import { darkColors, lightColors, type ThemeColors } from './tokens';

type Role = keyof ThemeColors;

type TextPairing = {
  fg: Role;
  bg: Role;
  /**
   * Large text (>= 18pt or >= 14pt bold) only needs 3:1. Currently NO pairing relies on this
   * exemption: every fill below passes 4.5:1 in both themes. Set it only with a justification.
   */
  large?: boolean;
};

const TEXT_PAIRINGS: readonly TextPairing[] = [
  // Copy on every surface
  { fg: 'textPrimary', bg: 'background' },
  { fg: 'textPrimary', bg: 'surface' },
  { fg: 'textPrimary', bg: 'surfaceElevated' },
  { fg: 'textPrimary', bg: 'inputBackground' },
  { fg: 'textSecondary', bg: 'background' },
  { fg: 'textSecondary', bg: 'surface' },
  { fg: 'textSecondary', bg: 'surfaceElevated' },
  { fg: 'textSecondary', bg: 'inputBackground' },
  // Buttons
  { fg: 'onPrimary', bg: 'primary' },
  { fg: 'onPrimary', bg: 'primaryPressed' },
  { fg: 'onPrimarySubtle', bg: 'primarySubtle' },
  { fg: 'onSecondary', bg: 'secondary' },
  // Status containers (banners, chips)
  { fg: 'onSuccessBg', bg: 'successBg' },
  { fg: 'onWarningBg', bg: 'warningBg' },
  { fg: 'onErrorBg', bg: 'errorBg' },
  { fg: 'onInfoBg', bg: 'infoBg' },
  // Status fills (badges, toasts). Bright fills use dark text, so normal-text AA holds.
  { fg: 'onSuccess', bg: 'success' },
  { fg: 'onWarning', bg: 'warning' },
  { fg: 'onError', bg: 'error' },
  { fg: 'onInfo', bg: 'info' },
  // Navigation and inverse
  { fg: 'tabBarActive', bg: 'surface' },
  { fg: 'tabBarInactive', bg: 'surface' },
  { fg: 'textInverse', bg: 'textPrimary' },
  // Inline validation text uses `error` directly on surfaces
  { fg: 'error', bg: 'background' },
  { fg: 'error', bg: 'surface' },
  { fg: 'error', bg: 'surfaceElevated' },
  // Links / brand text
  { fg: 'primary', bg: 'background' },
  { fg: 'primary', bg: 'surface' },
];

/** WCAG 1.4.11 non-text contrast (3:1) for component boundaries and focus indicators. */
const NON_TEXT_PAIRINGS: readonly { fg: Role; bg: Role }[] = [
  { fg: 'focusRing', bg: 'background' },
  { fg: 'focusRing', bg: 'surface' },
  { fg: 'borderStrong', bg: 'background' },
  { fg: 'borderStrong', bg: 'surface' },
  { fg: 'borderStrong', bg: 'surfaceElevated' },
  { fg: 'primary', bg: 'background' },
  { fg: 'primary', bg: 'surface' },
];

// Not asserted on purpose: `textDisabled` (WCAG exempts inactive controls), decorative `border`,
// `overlay` (rgba scrim, not a text background) and skeleton tones.

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s theme', (_scheme, colors) => {
  it.each(TEXT_PAIRINGS)('$fg on $bg meets WCAG AA for text', ({ fg, bg, large }) => {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    expect(meetsAA(colors[fg], colors[bg], { large })).toBe(true);
    expect(ratio).toBeGreaterThanOrEqual(large ? 3 : 4.5);
  });

  it.each(NON_TEXT_PAIRINGS)('$fg on $bg meets 3:1 non-text contrast', ({ fg, bg }) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('defines every role as a non-empty string', () => {
    for (const value of Object.values(colors)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('contrast math', () => {
  it('computes luminance for black and white', () => {
    expect(relativeLuminance(lightColors.background)).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('yields 21:1 for black on white and 1:1 for identical colors', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
    expect(contrastRatio(lightColors.primary, lightColors.primary)).toBe(1);
  });

  it('is symmetric', () => {
    expect(contrastRatio(lightColors.primary, lightColors.background)).toBe(
      contrastRatio(lightColors.background, lightColors.primary),
    );
  });

  it('expands short hex and ignores alpha', () => {
    expect(parseHex('#abc')).toEqual(parseHex('#aabbcc'));
    expect(parseHex('#abcd')).toEqual(parseHex('#aabbccdd'));
    expect(relativeLuminance('#ffffff80')).toBeCloseTo(1, 5);
  });

  it('rejects invalid input', () => {
    expect(() => relativeLuminance('red')).toThrow('Invalid hex color');
    expect(() => relativeLuminance('#12345')).toThrow('Invalid hex color');
    expect(() => relativeLuminance('rgba(0,0,0,1)')).toThrow('Invalid hex color');
  });

  it('applies the large-text threshold', () => {
    // focusRing on white is ~3.3:1: fails normal text, passes large text.
    expect(meetsAA(lightColors.focusRing, lightColors.background)).toBe(false);
    expect(meetsAA(lightColors.focusRing, lightColors.background, { large: true })).toBe(true);
  });
});
