import { useEffect } from 'react';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/shared/theme/motion';

/** One left-to-right sweep. */
export const SHIMMER_DURATION_MS = 1200;

export type Shimmer = {
  /** False under reduce motion: render the static base only. */
  animated: boolean;
  /** Translates a full-width highlight from fully left to fully right of the measured box. */
  animatedStyle: AnimatedStyle<ViewStyle>;
  onLayout: (event: LayoutChangeEvent) => void;
};

/** Looping shimmer for skeleton placeholders; static when the OS asks for reduced motion. */
export function useShimmer(): Shimmer {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(0);
      return;
    }
    progress.set(
      withRepeat(
        withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const measured = width.get();
    return {
      transform: [{ translateX: interpolate(progress.get(), [0, 1], [-measured, measured]) }],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    width.set(event.nativeEvent.layout.width);
  };

  return { animated: !reduceMotion, animatedStyle, onLayout };
}
