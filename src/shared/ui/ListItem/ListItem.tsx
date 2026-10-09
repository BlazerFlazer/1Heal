import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

/** Rows never get shorter than this, even with a single line of text. */
export const LIST_ITEM_MIN_HEIGHT = 56;

export type ListItemProps = {
  title: string;
  subtitle?: string;
  /** Icon or avatar, centred in a 40pt slot. */
  leading?: ReactNode;
  /** Custom trailing control (switch, badge). Stays individually accessible. */
  trailing?: ReactNode;
  /** Secondary text on the right ("1.2 km", "Ru"). */
  trailingText?: string;
  /** Chevron on the right. Defaults to on for pressable rows without other trailing content. */
  chevron?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  /** Hairline under the row. */
  divider?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Selection haptic on press. Defaults to true. */
  hapticsEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Standard list row: leading slot, title/subtitle, trailing text, chevron or control. */
export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  trailingText,
  chevron,
  onPress,
  disabled = false,
  divider = false,
  accessibilityLabel,
  accessibilityHint,
  hapticsEnabled = true,
  style,
  testID,
}: ListItemProps) {
  const { colors, spacing } = useTheme();
  const pressable = onPress !== undefined;
  const showChevron =
    chevron ?? (pressable && trailing === undefined && trailingText === undefined);
  const label = accessibilityLabel ?? [title, subtitle, trailingText].filter(Boolean).join(', ');

  const rowStyle = [
    styles.row,
    { paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[3] },
    divider
      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
      : null,
  ];

  const content = (
    <>
      {leading !== undefined ? (
        <View style={[styles.leading, { width: spacing[10], height: spacing[10] }]}>{leading}</View>
      ) : null}
      <View style={styles.body}>
        <Text numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailingText ? (
        <Text variant="label" color="textSecondary" numberOfLines={1}>
          {trailingText}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? (
        <View aria-hidden>
          <ChevronRight size={spacing[5]} color={colors.textSecondary} />
        </View>
      ) : null}
    </>
  );

  if (!pressable) {
    return (
      <View
        testID={testID}
        accessible={trailing === undefined}
        accessibilityLabel={label}
        style={[rowStyle, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled}
      hapticsEnabled={hapticsEnabled}
      scale={1}
      style={style}
    >
      {({ pressed }) => (
        <View style={[rowStyle, pressed ? { backgroundColor: colors.surface } : null]}>
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: LIST_ITEM_MIN_HEIGHT },
  leading: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
});
