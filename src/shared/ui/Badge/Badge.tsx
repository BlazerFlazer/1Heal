import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors, TypographyVariant } from '@/shared/theme/tokens';
import { Text } from '@/shared/ui/Text';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
export type BadgeSize = 'sm' | 'md';

export type BadgeProps = {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Text content. Ignored when `count` or `dot` is set. */
  label?: string;
  /** Numeric content; values above `max` render as `max+`. */
  count?: number;
  max?: number;
  /** Small status dot with no text. */
  dot?: boolean;
  /** Spoken description. Without it a dot is hidden from assistive tech. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type Palette = {
  background: keyof ThemeColors;
  foreground: keyof ThemeColors;
  dot: keyof ThemeColors;
};

const PALETTES: Record<BadgeTone, Palette> = {
  success: { background: 'successBg', foreground: 'onSuccessBg', dot: 'success' },
  warning: { background: 'warningBg', foreground: 'onWarningBg', dot: 'warning' },
  error: { background: 'errorBg', foreground: 'onErrorBg', dot: 'error' },
  info: { background: 'infoBg', foreground: 'onInfoBg', dot: 'info' },
  neutral: { background: 'secondary', foreground: 'textPrimary', dot: 'textSecondary' },
  primary: { background: 'primary', foreground: 'onPrimary', dot: 'primary' },
};

const DEFAULT_MAX = 99;

export function badgeText(label: string | undefined, count: number | undefined, max: number) {
  if (count !== undefined) {
    return count > max ? `${max}+` : String(count);
  }
  return label ?? '';
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  label,
  count,
  max = DEFAULT_MAX,
  dot = false,
  accessibilityLabel,
  style,
  testID,
}: BadgeProps) {
  const { colors, spacing, radii } = useTheme();
  const palette = PALETTES[tone];

  if (dot) {
    const side = size === 'sm' ? spacing[2] : spacing[3];
    return (
      <View
        testID={testID}
        accessible={accessibilityLabel !== undefined}
        importantForAccessibility={accessibilityLabel === undefined ? 'no' : 'yes'}
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            width: side,
            height: side,
            borderRadius: radii.full,
            backgroundColor: colors[palette.dot],
          },
          style,
        ]}
      />
    );
  }

  const text = badgeText(label, count, max);
  const variant: TypographyVariant = size === 'sm' ? 'overline' : 'caption';
  const height = size === 'sm' ? spacing[5] : spacing[6];

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[
        styles.pill,
        {
          height,
          minWidth: height,
          paddingHorizontal: size === 'sm' ? spacing[2] : spacing[3],
          borderRadius: radii.full,
          backgroundColor: colors[palette.background],
        },
        style,
      ]}
    >
      <Text variant={variant} color={palette.foreground} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
});
