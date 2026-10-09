import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH, type ThemeColors } from '@/shared/theme/tokens';
import { PressableScale, type PressableScaleProps } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

export type ChipSize = 'sm' | 'md';

export type ChipProps = Omit<PressableScaleProps, 'children' | 'accessibilityRole'> & {
  label: string;
  selected?: boolean;
  leftIcon?: LucideIcon;
  /** 32pt or 40pt tall; both pad their hit area to 44pt. */
  size?: ChipSize;
};

const CHIP_BORDER_WIDTH = 1;

type Palette = { background: string; border: string; foreground: keyof ThemeColors };

function paletteFor(colors: ThemeColors, selected: boolean): Palette {
  return selected
    ? { background: colors.primarySubtle, border: colors.primary, foreground: 'onPrimarySubtle' }
    : { background: colors.surfaceElevated, border: colors.border, foreground: 'textPrimary' };
}

/** Filter chip: a toggleable pill with an optional leading icon. */
export function Chip({
  label,
  selected = false,
  leftIcon: LeftIcon,
  size = 'md',
  hapticsEnabled = true,
  accessibilityLabel,
  accessibilityState,
  style,
  ...rest
}: ChipProps) {
  const { colors, spacing, radii } = useTheme();
  const palette = paletteFor(colors, selected);
  const height = size === 'sm' ? spacing[8] : spacing[10];
  const slack = (MIN_TOUCH - height) / 2;

  return (
    <PressableScale
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, selected }}
      hapticsEnabled={hapticsEnabled}
      hitSlop={{ top: slack, bottom: slack }}
      style={[
        styles.base,
        {
          height,
          paddingHorizontal: size === 'sm' ? spacing[3] : spacing[4],
          gap: spacing[1],
          borderRadius: radii.full,
          borderWidth: CHIP_BORDER_WIDTH,
          borderColor: palette.border,
          backgroundColor: palette.background,
        },
        style,
      ]}
    >
      {LeftIcon ? <LeftIcon size={spacing[4]} color={colors[palette.foreground]} /> : null}
      <Text variant="label" color={palette.foreground} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
