import type { Ref } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { haptics } from '@/shared/theme/haptics';
import { usePressAnimation } from '@/shared/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Opacity applied to the whole control while it is disabled. */
export const DISABLED_OPACITY = 0.5;

export type PressableScaleProps = Omit<PressableProps, 'style' | 'android_ripple'> & {
  ref?: Ref<View>;
  /** Static styles only; animated scale is composed on top. */
  style?: StyleProp<ViewStyle>;
  /** Fires `haptics.selection()` on press. Off by default. */
  hapticsEnabled?: boolean;
  /** Scale while pressed. Defaults to `motion.pressScale`. */
  scale?: number;
  /** Dim the control while disabled. Defaults to true. */
  dimWhenDisabled?: boolean;
};

/**
 * Base pressable: Reanimated spring scale on press (no-op under reduce motion), optional
 * selection haptic, disabled opacity and the disabled accessibility state. Ripple is off so
 * every control looks the same on both platforms.
 */
export function PressableScale({
  ref,
  style,
  hapticsEnabled = false,
  scale,
  dimWhenDisabled = true,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityState,
  accessibilityRole = 'button',
  children,
  ...rest
}: PressableScaleProps) {
  const press = usePressAnimation(scale === undefined ? {} : { scale });
  const isDisabled = disabled === true;

  const handlePressIn = (event: GestureResponderEvent) => {
    press.onPressIn();
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    press.onPressOut();
    onPressOut?.(event);
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (hapticsEnabled) {
      void haptics.selection();
    }
    onPress?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      ref={ref}
      disabled={isDisabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
      style={[
        press.animatedStyle,
        isDisabled && dimWhenDisabled ? { opacity: DISABLED_OPACITY } : null,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
