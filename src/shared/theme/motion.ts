import type { ViewStyle } from 'react-native';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { motion } from './tokens';

export const durations = motion.durations;

/** True when the OS "reduce motion" setting is on. Animations must become instant or no-ops. */
export function useReduceMotion(): boolean {
  return useReducedMotion();
}

export type PressAnimationOptions = {
  /** Scale while pressed. Defaults to `motion.pressScale`. */
  scale?: number;
};

export type PressAnimation = {
  animatedStyle: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
};

/**
 * Spring scale-down on press for `Animated.View`/`Pressable` wrappers.
 * No-op (scale stays 1) when reduce motion is enabled.
 */
export function usePressAnimation(options: PressAnimationOptions = {}): PressAnimation {
  const reduceMotion = useReduceMotion();
  const pressedScale = options.scale ?? motion.pressScale;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const onPressIn = () => {
    if (reduceMotion) {
      return;
    }
    scale.set(withSpring(pressedScale, motion.spring));
  };

  const onPressOut = () => {
    if (reduceMotion) {
      return;
    }
    scale.set(withSpring(1, motion.spring));
  };

  return { animatedStyle, onPressIn, onPressOut };
}
