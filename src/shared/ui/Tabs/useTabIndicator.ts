import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/shared/theme/motion';
import { motion } from '@/shared/theme/tokens';

export type TabLayout = { x: number; width: number };

/**
 * Style for the sliding selection indicator: springs to the active tab's measured frame,
 * jumps under reduce motion, stays invisible until the first measurement.
 */
export function useTabIndicator(target: TabLayout | undefined): AnimatedStyle<ViewStyle> {
  const reduceMotion = useReduceMotion();
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const targetX = target?.x;
  const targetWidth = target?.width;

  useEffect(() => {
    if (targetX === undefined || targetWidth === undefined) {
      return;
    }
    if (reduceMotion || width.get() === 0) {
      x.set(targetX);
      width.set(targetWidth);
      return;
    }
    x.set(withSpring(targetX, motion.spring));
    width.set(withSpring(targetWidth, motion.spring));
  }, [reduceMotion, targetWidth, targetX, width, x]);

  return useAnimatedStyle(() => ({
    width: width.get(),
    opacity: width.get() > 0 ? 1 : 0,
    transform: [{ translateX: x.get() }],
  }));
}
