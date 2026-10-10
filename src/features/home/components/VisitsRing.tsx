import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useReduceMotion, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_DURATION_MS = 900;

export type VisitsRingProps = {
  left: number;
  total: number;
  /** Small caption under the number ("of 12"). */
  caption: string;
  accessibilityLabel: string;
  size?: number;
  testID?: string;
};

/** Circular progress of visits left in the period; fills in on mount (instant with reduce motion). */
export function VisitsRing({
  left,
  total,
  caption,
  accessibilityLabel,
  size = 104,
  testID,
}: VisitsRingProps) {
  const { colors, spacing } = useTheme();
  const reduceMotion = useReduceMotion();
  const stroke = spacing[2] + spacing[1] / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  const progress = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    progress.set(
      reduceMotion
        ? target
        : withTiming(target, { duration: RING_DURATION_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress, reduceMotion, target]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: total, now: left }}
      testID={testID}
      style={[styles.box, { width: size, height: size }]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primarySubtle}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="title" color="textPrimary">
        {String(left)}
      </Text>
      <Text variant="caption" color="textSecondary">
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
