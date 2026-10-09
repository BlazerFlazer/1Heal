import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ElevationLevel } from '@/shared/theme/elevation';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { SpacingKey } from '@/shared/theme/tokens';
import { PressableScale } from '@/shared/ui/Pressable';

export type CardRadius = 'md' | 'lg';

export type CardProps = {
  children?: ReactNode;
  radius?: CardRadius;
  elevation?: ElevationLevel;
  /** Spacing token applied on all sides. Defaults to 4 (16pt). */
  padding?: SpacingKey;
  /** Makes the card a button (spring scale, haptic-free). */
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Elevated surface. With `onPress` it becomes a `PressableScale` with the button role. */
export function Card({
  children,
  radius = 'md',
  elevation = 1,
  padding = 4,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const surface: ViewStyle = {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radii[radius],
    padding: theme.spacing[padding],
    ...theme.elevation(elevation),
  };

  if (onPress) {
    return (
      <PressableScale
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.base, surface, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, surface, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth, overflow: 'visible' },
});
