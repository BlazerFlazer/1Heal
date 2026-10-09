import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { RadiusKey, SpacingKey } from '@/shared/theme/tokens';

import { useShimmer } from './useShimmer';

type SkeletonBaseProps = {
  /**
   * Hides the placeholder from assistive tech. Set it when a parent already announces loading for
   * the whole group; otherwise the placeholder is read as a busy progress bar.
   */
  'aria-hidden'?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type SkeletonBoxProps = SkeletonBaseProps & {
  width?: DimensionValue;
  /** Defaults to 16pt. */
  height?: number;
  radius?: RadiusKey;
};

export type SkeletonTextProps = SkeletonBaseProps & {
  lines?: number;
  /** Defaults to 12pt lines on a 24pt pitch, matching body text. */
  lineHeight?: number;
  width?: DimensionValue;
  /** Width of the last line when there is more than one. */
  lastLineWidth?: DimensionValue;
  gap?: SpacingKey;
};

export type SkeletonCircleProps = SkeletonBaseProps & {
  /** Defaults to 40pt. */
  size?: number;
};

/** Rounded placeholder block with a looping shimmer. */
export function SkeletonBox({
  width = '100%',
  height,
  radius = 'sm',
  'aria-hidden': hidden = false,
  style,
  testID,
}: SkeletonBoxProps) {
  const { colors, radii, spacing } = useTheme();
  const { t } = useTranslation();
  const shimmer = useShimmer();
  return (
    <View
      testID={testID}
      onLayout={shimmer.onLayout}
      aria-hidden={hidden}
      accessible={!hidden}
      accessibilityRole={hidden ? undefined : 'progressbar'}
      accessibilityLabel={hidden ? undefined : t('ui.skeleton.loading')}
      accessibilityState={hidden ? undefined : { busy: true }}
      style={[
        styles.box,
        {
          width,
          height: height ?? spacing[4],
          borderRadius: radii[radius],
          backgroundColor: colors.skeletonBase,
        },
        style,
      ]}
    >
      {shimmer.animated ? (
        <Animated.View
          testID={testID === undefined ? undefined : `${testID}-shimmer`}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.skeletonHighlight },
            shimmer.animatedStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

/** A paragraph: several lines, the last one shorter. */
export function SkeletonText({
  lines = 3,
  lineHeight,
  width = '100%',
  lastLineWidth = '60%',
  gap = 3,
  'aria-hidden': hidden = false,
  style,
  testID,
}: SkeletonTextProps) {
  const { spacing } = useTheme();
  const { t } = useTranslation();
  const height = lineHeight ?? spacing[3];
  return (
    <View
      testID={testID}
      aria-hidden={hidden}
      accessible={!hidden}
      accessibilityRole={hidden ? undefined : 'progressbar'}
      accessibilityLabel={hidden ? undefined : t('ui.skeleton.loading')}
      accessibilityState={hidden ? undefined : { busy: true }}
      style={[{ width, gap: spacing[gap] }, style]}
    >
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonBox
          key={index}
          aria-hidden
          height={height}
          width={lines > 1 && index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </View>
  );
}

/** Avatar / icon placeholder. */
export function SkeletonCircle({
  size,
  'aria-hidden': hidden,
  style,
  testID,
}: SkeletonCircleProps) {
  const { spacing } = useTheme();
  const side = size ?? spacing[10];
  return (
    <SkeletonBox
      testID={testID}
      aria-hidden={hidden}
      width={side}
      height={side}
      radius="full"
      style={style}
    />
  );
}

export const Skeleton = { Box: SkeletonBox, Text: SkeletonText, Circle: SkeletonCircle } as const;

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});
