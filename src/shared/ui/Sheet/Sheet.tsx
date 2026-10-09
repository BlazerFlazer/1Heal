import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { durations, useReduceMotion } from '@/shared/theme/motion';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { MIN_TOUCH } from '@/shared/theme/tokens';
import { Text } from '@/shared/ui/Text';

import { useSheetGesture } from './useSheetGesture';

/** Tallest the panel grows, as a fraction of the window height. */
export const SHEET_MAX_HEIGHT_RATIO = 0.9;

export type SheetProps = {
  visible: boolean;
  /** Called on backdrop press, drag-to-close, the handle button and the hardware back button. */
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /** Defaults to `SHEET_MAX_HEIGHT_RATIO` (90%). */
  maxHeightRatio?: number;
  /** Also applied as `${testID}-backdrop`, `${testID}-panel` and `${testID}-handle`. */
  testID?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Bottom sheet in an RN `Modal`: content-sized up to `maxHeightRatio`, slides up (fades under
 * reduce motion), closes on backdrop press, handle press, hardware back or a downward drag.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = SHEET_MAX_HEIGHT_RATIO,
  testID,
}: SheetProps) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const panelHeight = useSharedValue(windowHeight);
  const sub = (suffix: string) => (testID === undefined ? undefined : `${testID}-${suffix}`);

  const unmount = useCallback(() => setMounted(false), []);
  if (visible && !mounted) {
    // Derived state: mount synchronously on the render that opens the sheet.
    setMounted(true);
  }

  useEffect(() => {
    if (visible) {
      dragY.set(0);
      progress.set(withTiming(1, { duration: durations.slow, easing: Easing.out(Easing.cubic) }));
      return;
    }
    progress.set(
      withTiming(0, { duration: durations.base, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          scheduleOnRN(unmount);
        }
      }),
    );
  }, [dragY, progress, unmount, visible]);

  const gesture = useSheetGesture({ dragY, panelHeight, enabled: visible, onDismiss: onClose });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => {
    const shown = progress.get();
    if (reduceMotion) {
      return { opacity: shown, transform: [{ translateY: dragY.get() }] };
    }
    return {
      opacity: 1,
      transform: [{ translateY: (1 - shown) * panelHeight.get() + dragY.get() }],
    };
  });

  const onPanelLayout = (event: LayoutChangeEvent) => {
    panelHeight.set(event.nativeEvent.layout.height);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      testID={testID}
    >
      <GestureHandlerRootView style={styles.root}>
        <AnimatedPressable
          testID={sub('backdrop')}
          accessibilityRole="button"
          accessibilityLabel={t('ui.sheet.close')}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}
        />
        <Animated.View
          testID={sub('panel')}
          accessibilityViewIsModal
          onLayout={onPanelLayout}
          style={[
            styles.panel,
            {
              maxHeight: windowHeight * maxHeightRatio,
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: radii.lg,
              borderTopRightRadius: radii.lg,
              paddingBottom: insets.bottom + spacing[4],
            },
            theme.elevation(3),
            panelStyle,
          ]}
        >
          <GestureDetector gesture={gesture}>
            <View>
              <Pressable
                testID={sub('handle')}
                accessibilityRole="button"
                accessibilityLabel={t('ui.sheet.dragHandle')}
                onPress={onClose}
                style={styles.handleArea}
              >
                <View
                  style={{
                    width: spacing[10],
                    height: spacing[1],
                    borderRadius: radii.full,
                    backgroundColor: colors.borderStrong,
                  }}
                />
              </Pressable>
              {title ? (
                <Text
                  variant="subtitle"
                  accessibilityRole="header"
                  style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[3] }}
                >
                  {title}
                </Text>
              ) : null}
            </View>
          </GestureDetector>
          <View style={[styles.content, { paddingHorizontal: spacing[4] }]}>{children}</View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: { width: '100%' },
  handleArea: { minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  content: { flexShrink: 1 },
});
