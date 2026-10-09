import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH, type ThemeColors } from '@/shared/theme/tokens';
import { PressableScale, type PressableScaleProps } from '@/shared/ui/Pressable';

export type IconButtonVariant = 'ghost' | 'filled' | 'primary' | 'outline';
/** `md` is the 44pt minimum target; `lg` is 56pt. */
export type IconButtonSize = 'md' | 'lg';

export type IconButtonProps = Omit<
  PressableScaleProps,
  'children' | 'accessibilityLabel' | 'accessibilityRole'
> & {
  icon: LucideIcon;
  /** Required: an icon alone says nothing to a screen reader. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Overrides the icon color role (e.g. `error` for a favourite heart). */
  iconColor?: keyof ThemeColors;
};

const ICON_BUTTON_BORDER_WIDTH = 1;

type Palette = { background: string; foreground: keyof ThemeColors; border: string };

function paletteFor(colors: ThemeColors, variant: IconButtonVariant): Palette {
  switch (variant) {
    case 'ghost':
      return { background: 'transparent', foreground: 'textPrimary', border: 'transparent' };
    case 'filled':
      return { background: colors.secondary, foreground: 'onSecondary', border: 'transparent' };
    case 'primary':
      return { background: colors.primary, foreground: 'onPrimary', border: 'transparent' };
    case 'outline':
      return { background: 'transparent', foreground: 'textPrimary', border: colors.borderStrong };
  }
}

/** Circular 44pt (or 56pt) button around a single lucide icon. */
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  variant = 'ghost',
  size = 'md',
  iconColor,
  hapticsEnabled = true,
  style,
  ...rest
}: IconButtonProps) {
  const { colors, spacing, radii } = useTheme();
  const palette = paletteFor(colors, variant);
  const side = size === 'lg' ? spacing[12] + spacing[2] : MIN_TOUCH;
  const iconSize = size === 'lg' ? spacing[6] : spacing[5];

  return (
    <PressableScale
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hapticsEnabled={hapticsEnabled}
      style={[
        styles.base,
        {
          width: side,
          height: side,
          borderRadius: radii.full,
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? ICON_BUTTON_BORDER_WIDTH : 0,
        },
        style,
      ]}
    >
      <Icon size={iconSize} color={colors[iconColor ?? palette.foreground]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
