import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useReduceMotion, useTheme } from '@/shared/theme';

import { ONBOARDING_TEST_IDS } from './testIds';

export type PagerDotsProps = {
  count: number;
  /** Page the pager has settled on; drives the spoken "slide x of y". */
  activeIndex: number;
  /** Horizontal scroll offset of the pager, in points. */
  scrollX: SharedValue<number>;
  pageWidth: number;
  testID?: string;
};

const INACTIVE_OPACITY = 0.3;

type DotProps = {
  index: number;
  active: boolean;
  scrollX: SharedValue<number>;
  pageWidth: number;
  reduceMotion: boolean;
};

/** Grows from a dot to a pill as its page scrolls into view; snaps instead under reduce motion. */
function Dot({ index, active, scrollX, pageWidth, reduceMotion }: DotProps) {
  const { colors, spacing, radii } = useTheme();
  const inactiveWidth = spacing[2];
  const activeWidth = spacing[6];

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        width: active ? activeWidth : inactiveWidth,
        opacity: active ? 1 : INACTIVE_OPACITY,
      };
    }
    const input = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    const x = scrollX.get();
    return {
      width: interpolate(
        x,
        input,
        [inactiveWidth, activeWidth, inactiveWidth],
        Extrapolation.CLAMP,
      ),
      opacity: interpolate(x, input, [INACTIVE_OPACITY, 1, INACTIVE_OPACITY], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View
      testID={ONBOARDING_TEST_IDS.dot(index)}
      style={[
        { height: spacing[2], borderRadius: radii.full, backgroundColor: colors.primary },
        animatedStyle,
      ]}
    />
  );
}

/** Page indicator for the onboarding pager; announced as one element ("slide 2 of 3"). */
export function PagerDots({ count, activeIndex, scrollX, pageWidth, testID }: PagerDotsProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const reduceMotion = useReduceMotion();

  return (
    <View
      accessible
      accessibilityLabel={t('onboarding.pager.label', { current: activeIndex + 1, total: count })}
      testID={testID}
      style={[styles.row, { gap: spacing[2] }]}
    >
      {Array.from({ length: count }, (_, index) => (
        <Dot
          key={index}
          index={index}
          active={index === activeIndex}
          scrollX={scrollX}
          pageWidth={pageWidth}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
