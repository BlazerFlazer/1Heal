import { Platform, type ViewStyle } from 'react-native';

import type { ThemeColors } from './tokens';

export type ElevationLevel = 0 | 1 | 2 | 3;

export type ElevationStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation' | 'boxShadow'
>;

type ShadowSpec = {
  readonly y: number;
  /** CSS blur radius (px). iOS `shadowRadius` is roughly half of it. */
  readonly blur: number;
  readonly opacity: number;
  readonly android: number;
};

const SHADOWS: Record<ElevationLevel, ShadowSpec> = {
  0: { y: 0, blur: 0, opacity: 0, android: 0 },
  1: { y: 1, blur: 3, opacity: 0.08, android: 1 },
  2: { y: 4, blur: 12, opacity: 0.1, android: 3 },
  3: { y: 10, blur: 24, opacity: 0.14, android: 6 },
};

/** Appends an 8-bit alpha channel to a `#RRGGBB` color (CSS Color 4 `#RRGGBBAA`). */
function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alpha}`;
}

/**
 * Platform shadow style for an elevation level, tinted with the theme's `shadow` color.
 * iOS: `shadow*`; Android: `elevation`; web: `boxShadow` string.
 */
export function elevationFor(
  colors: Pick<ThemeColors, 'shadow'>,
  level: ElevationLevel,
): ElevationStyle {
  const spec = SHADOWS[level];
  return Platform.select<ElevationStyle>({
    web: {
      boxShadow:
        level === 0
          ? 'none'
          : `0 ${spec.y}px ${spec.blur}px ${withAlpha(colors.shadow, spec.opacity)}`,
    },
    default: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: spec.y },
      shadowOpacity: spec.opacity,
      shadowRadius: spec.blur / 2,
      elevation: spec.android,
    },
  });
}
