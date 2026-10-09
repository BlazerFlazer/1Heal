import { WifiOff } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useNetworkStatus } from '@/services/network/useNetworkStatus';
import { durations, useReduceMotion } from '@/shared/theme/motion';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { Text } from '@/shared/ui/Text';

export type OfflineBannerProps = {
  style?: StyleProp<ViewStyle>;
  /** Also applied as `${testID}-content` on the inner banner. */
  testID?: string;
};

/** Thin warning strip that grows in while the device is offline and collapses when back online. */
export function OfflineBanner({ style, testID }: OfflineBannerProps) {
  const { isOnline } = useNetworkStatus();
  const offline = isOnline === false;
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const height = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const animateTo = useCallback(
    (value: number) => {
      height.set(reduceMotion ? value : withTiming(value, { duration: durations.base }));
    },
    [height, reduceMotion],
  );

  useEffect(() => {
    animateTo(offline ? contentHeight.get() : 0);
  }, [animateTo, contentHeight, offline]);

  const onLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    contentHeight.set(measured);
    if (offline) {
      animateTo(measured);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({ height: height.get() }));

  return (
    <Animated.View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityElementsHidden={!offline}
      importantForAccessibility={offline ? 'auto' : 'no-hide-descendants'}
      style={[styles.clip, animatedStyle, style]}
    >
      <View
        testID={testID === undefined ? undefined : `${testID}-content`}
        onLayout={onLayout}
        style={[
          styles.banner,
          {
            backgroundColor: colors.warningBg,
            paddingVertical: spacing[2],
            paddingHorizontal: spacing[4],
            gap: spacing[2],
          },
        ]}
      >
        <WifiOff size={spacing[4]} color={colors.onWarningBg} />
        <Text variant="label" color="onWarningBg" style={styles.text} numberOfLines={2}>
          {t('ui.offline.banner')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  banner: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
});
