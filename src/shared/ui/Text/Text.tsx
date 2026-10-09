import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors, TypographyVariant } from '@/shared/theme/tokens';

/** Largest dynamic-type multiplier before layouts break; still honours accessibility sizes. */
export const MAX_FONT_SIZE_MULTIPLIER = 1.6;

export type TextProps = RNTextProps & {
  /** Typography variant from `typography` tokens. */
  variant?: TypographyVariant;
  /** Any `ThemeColors` role; use `textPrimary`/`textSecondary` for copy, `on*` on fills. */
  color?: keyof ThemeColors;
  align?: TextStyle['textAlign'];
};

export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  allowFontScaling = true,
  maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();
  return (
    <RNText
      {...rest}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typography[variant],
        { color: colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
