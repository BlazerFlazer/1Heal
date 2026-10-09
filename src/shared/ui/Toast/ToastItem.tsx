import { X } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { durations, useReduceMotion } from '@/shared/theme/motion';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH, motion } from '@/shared/theme/tokens';
import { IconButton } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

import { isSwipeDismiss, type ToastRecord } from './toastQueue';
import { toastPalette } from './toastTheme';

export type ToastItemProps = {
  toast: ToastRecord;
  /** Called once the exit animation has finished. */
  onDismiss: (id: number) => void;
  testID?: string;
};

/** One toast: fades (and slides, unless reduce motion) in, auto-dismisses, swipes up to close. */
export function ToastItem({ toast, onDismiss, testID }: ToastItemProps) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const palette = toastPalette(toast.tone);
  const Icon = palette.icon;
  const action = toast.action;
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const closing = useSharedValue(false);
  const slide = spacing[6];

  const finish = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);
  const close = useCallback(() => {
    if (closing.get()) {
      return;
    }
    closing.set(true);
    progress.set(
      withTiming(0, { duration: durations.fast }, (finished) => {
        if (finished) {
          scheduleOnRN(finish);
        }
      }),
    );
  }, [closing, finish, progress]);

  useEffect(() => {
    progress.set(withTiming(1, { duration: durations.base }));
  }, [progress]);

  useEffect(() => {
    const timer = setTimeout(close, toast.durationMs);
    return () => clearTimeout(timer);
  }, [close, toast.durationMs]);

  const pan = Gesture.Pan()
    .activeOffsetY([-spacing[2], spacing[2]])
    .onUpdate((event) => {
      dragY.set(Math.min(0, event.translationY));
    })
    .onEnd((event) => {
      if (isSwipeDismiss(event.translationY, event.velocityY)) {
        scheduleOnRN(close);
      } else {
        dragY.set(withSpring(0, motion.spring));
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const shown = progress.get();
    const offset = reduceMotion ? 0 : (1 - shown) * -slide;
    return { opacity: shown, transform: [{ translateY: dragY.get() + offset }] };
  });

  const isError = toast.tone === 'error';

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={testID}
        accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
        accessibilityRole={isError ? 'alert' : undefined}
        style={[
          styles.item,
          {
            backgroundColor: colors[palette.background],
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing[1],
            paddingLeft: spacing[4],
            paddingRight: spacing[1],
            gap: spacing[2],
          },
          theme.elevation(2),
          animatedStyle,
        ]}
      >
        {Icon ? <Icon size={spacing[5]} color={colors[palette.foreground]} /> : null}
        <Text style={styles.message} color={palette.foreground} numberOfLines={3}>
          {toast.message}
        </Text>
        {action ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              action.onPress();
              close();
            }}
            hapticsEnabled
            style={[styles.action, { paddingHorizontal: spacing[2] }]}
          >
            <Text variant="label" color={palette.foreground}>
              {action.label}
            </Text>
          </PressableScale>
        ) : null}
        <IconButton
          icon={X}
          accessibilityLabel={t('ui.toast.dismiss')}
          onPress={close}
          iconColor={palette.foreground}
          hapticsEnabled={false}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TOUCH,
  },
  message: { flex: 1 },
  action: { minHeight: MIN_TOUCH, justifyContent: 'center' },
});
