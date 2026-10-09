import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { haptics } from '@/shared/theme/haptics';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH } from '@/shared/theme/tokens';

import { RatingStar } from './RatingStar';

export const RATING_MAX = 5;
export type RatingSize = 'sm' | 'md' | 'lg';

export type RatingProps = {
  /** 0..5; display rounds to the nearest half star. */
  value: number;
  /** Makes the control interactive (whole stars) unless `readOnly`. */
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: RatingSize;
  /** Spoken name, e.g. t('ui.rating.label', { value }). */
  accessibilityLabel: string;
  /** Spoken value, e.g. "4 of 5"; defaults to the number. */
  valueText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Clamps to 0..5 and rounds to the nearest half. */
export function clampRating(value: number): number {
  const rounded = Math.round(value * 2) / 2;
  return Math.min(RATING_MAX, Math.max(0, Number.isFinite(rounded) ? rounded : 0));
}

function starFill(value: number, index: number): 0 | 0.5 | 1 {
  const remainder = value - index;
  if (remainder >= 1) return 1;
  if (remainder >= 0.5) return 0.5;
  return 0;
}

/**
 * Five stars with half-star display. Interactive mode is one `adjustable` element: taps set a
 * whole star, VoiceOver/TalkBack increment and decrement by one.
 */
export function Rating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  accessibilityLabel,
  valueText,
  style,
  testID,
}: RatingProps) {
  const { spacing } = useTheme();
  const interactive = !readOnly && onChange !== undefined;
  const clamped = clampRating(value);
  const starSize = { sm: spacing[4], md: spacing[6], lg: spacing[8] }[size];
  const slack = Math.max(0, (MIN_TOUCH - starSize) / 2);

  const commit = (next: number) => {
    if (!interactive || next === clamped) return;
    void haptics.selection();
    onChange?.(next);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    if (actionName === 'increment') commit(Math.min(RATING_MAX, Math.floor(clamped) + 1));
    if (actionName === 'decrement') commit(Math.max(0, Math.ceil(clamped) - 1));
  };

  const stars = Array.from({ length: RATING_MAX }, (_, index) => {
    const star = (
      <RatingStar
        fill={starFill(clamped, index)}
        size={starSize}
        testID={testID ? `${testID}-star-${index}` : undefined}
      />
    );
    if (!interactive) {
      return <View key={index}>{star}</View>;
    }
    return (
      <Pressable
        key={index}
        testID={testID ? `${testID}-press-${index}` : undefined}
        onPress={() => commit(index + 1)}
        hitSlop={slack}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {star}
      </Pressable>
    );
  });

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole={interactive ? 'adjustable' : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: RATING_MAX, now: clamped, text: valueText }}
      accessibilityActions={interactive ? ADJUST_ACTIONS : undefined}
      onAccessibilityAction={interactive ? handleAccessibilityAction : undefined}
      style={[styles.row, { gap: interactive ? spacing[2] : spacing[1] }, style]}
    >
      {stars}
    </View>
  );
}

const ADJUST_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }] as const;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
