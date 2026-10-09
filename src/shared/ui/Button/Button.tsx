import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { haptics } from '@/shared/theme/haptics';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH } from '@/shared/theme/tokens';
import { PressableScale, type PressableScaleProps } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

import {
  buttonMetrics,
  buttonPalette,
  type ButtonHaptic,
  type ButtonSize,
  type ButtonVariant,
} from './buttonTheme';

export type ButtonProps = Omit<
  PressableScaleProps,
  'children' | 'hapticsEnabled' | 'onPress' | 'accessibilityRole'
> & {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Replaces the label with a spinner, keeps the width and blocks presses. */
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
  /** Haptic played on press. Defaults to a light impact. */
  haptic?: ButtonHaptic;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  haptic = 'light',
  accessibilityLabel,
  accessibilityState,
  style,
  testID,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const palette = buttonPalette(theme.colors, variant);
  const metrics = buttonMetrics(theme, size);
  const isDisabled = disabled === true;
  const slack = Math.max(0, (MIN_TOUCH - metrics.height) / 2);

  const handlePress = (event: GestureResponderEvent) => {
    if (haptic !== 'none') {
      void haptics[haptic]();
    }
    onPress?.(event);
  };

  return (
    <PressableScale
      {...rest}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, busy: loading }}
      disabled={isDisabled || loading}
      dimWhenDisabled={isDisabled}
      onPress={handlePress}
      hitSlop={slack > 0 ? { top: slack, bottom: slack } : undefined}
      style={[
        { height: metrics.height, borderRadius: theme.radii.sm },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.surface,
            {
              backgroundColor: pressed ? palette.pressedBackground : palette.background,
              borderColor: palette.border,
              borderWidth: palette.borderWidth,
              borderRadius: theme.radii.sm,
              paddingHorizontal: metrics.paddingHorizontal,
            },
          ]}
        >
          <View style={[styles.row, { gap: metrics.gap }, loading ? styles.hidden : null]}>
            {LeftIcon ? <LeftIcon size={metrics.iconSize} color={palette.foreground} /> : null}
            <Text variant={metrics.textVariant} color={palette.foregroundRole} numberOfLines={1}>
              {label}
            </Text>
            {RightIcon ? <RightIcon size={metrics.iconSize} color={palette.foreground} /> : null}
          </View>
          {loading ? (
            <ActivityIndicator
              testID={testID ? `${testID}-spinner` : undefined}
              style={StyleSheet.absoluteFill}
              color={palette.foreground}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  surface: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  hidden: { opacity: 0 },
});
