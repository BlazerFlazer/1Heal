import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { SpacingKey, ThemeColors } from '@/shared/theme/tokens';

export type DividerOrientation = 'horizontal' | 'vertical';

export type DividerProps = {
  orientation?: DividerOrientation;
  /** Spacing token trimmed from both ends (left/right for horizontal, top/bottom for vertical). */
  inset?: SpacingKey;
  color?: keyof ThemeColors;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Hairline separator. Hidden from assistive tech: it carries no information of its own. */
export function Divider({
  orientation = 'horizontal',
  inset = 0,
  color = 'border',
  style,
  testID,
}: DividerProps) {
  const { colors, spacing } = useTheme();
  const horizontal = orientation === 'horizontal';
  return (
    <View
      testID={testID}
      aria-hidden
      role="separator"
      style={[
        horizontal ? styles.horizontal : styles.vertical,
        { backgroundColor: colors[color] },
        horizontal ? { marginHorizontal: spacing[inset] } : { marginVertical: spacing[inset] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  vertical: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
