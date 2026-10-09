import { StyleSheet, Text, View } from 'react-native';

import { BRAND_NAME } from '@/shared/config/brand';
import { useTheme } from '@/shared/theme';
import { fontFamilies } from '@/shared/theme/tokens';

import { LogoMark } from './LogoMark';

export { LogoMark };

export type LogoVariant = 'mark' | 'lockup';

export type LogoProps = {
  /** Height of the mark in points; the wordmark scales with it. Defaults to 32. */
  size?: number;
  /**
   * Single colour for the whole logo (for example white on a green surface). When omitted the
   * mark uses the theme primary colour and the wordmark the primary text colour.
   */
  color?: string;
  /** `mark` renders only the leaf; `lockup` adds the wordmark to its right. */
  variant?: LogoVariant;
  testID?: string;
};

/** Lockup proportions relative to the mark height. Brand constants, not UI spacing tokens. */
const WORDMARK_FONT_RATIO = 0.78;
const WORDMARK_GAP_RATIO = 0.28;
const WORDMARK_TRACKING = -0.02;

/** Themed brand logo: the mark alone or the mark + "1Heal" wordmark set in Inter Bold. */
export function Logo({ size = 32, color, variant = 'mark', testID }: LogoProps) {
  const { colors } = useTheme();
  const markColor = color ?? colors.primary;

  if (variant === 'mark') {
    return <LogoMark size={size} color={markColor} testID={testID} />;
  }

  const fontSize = size * WORDMARK_FONT_RATIO;

  return (
    <View
      style={[styles.lockup, { gap: size * WORDMARK_GAP_RATIO }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={BRAND_NAME}
      testID={testID}
    >
      <LogoMark size={size} color={markColor} decorative />
      <Text
        style={{
          fontFamily: fontFamilies.bold,
          fontSize,
          lineHeight: size,
          letterSpacing: fontSize * WORDMARK_TRACKING,
          color: color ?? colors.textPrimary,
        }}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {BRAND_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
