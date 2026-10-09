import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH } from '@/shared/theme/tokens';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

export type SectionAction = {
  label: string;
  onPress: () => void;
  /** Spoken label when the visible one is too terse ("See all" -> "See all venues"). */
  accessibilityLabel?: string;
};

export type SectionProps = {
  title: string;
  /** Trailing text action in the header row ("See all"). */
  action?: SectionAction;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Also applied as `${testID}-action` on the action. */
  testID?: string;
};

/** Titled block: subtitle header, optional action, children with consistent spacing. */
export function Section({ title, action, children, style, testID }: SectionProps) {
  const { spacing } = useTheme();
  return (
    <View testID={testID} style={[{ gap: spacing[3] }, style]}>
      <View style={styles.header}>
        <Text variant="subtitle" accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {action ? (
          <PressableScale
            testID={testID === undefined ? undefined : `${testID}-action`}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            onPress={action.onPress}
            hapticsEnabled
            style={[styles.action, { paddingHorizontal: spacing[2] }]}
          >
            <Text variant="label" color="primary">
              {action.label}
            </Text>
          </PressableScale>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH,
  },
  title: { flexShrink: 1 },
  action: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center' },
});
