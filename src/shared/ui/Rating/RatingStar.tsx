import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';

export type RatingStarProps = {
  /** 0 (empty), 0.5 (half) or 1 (full). */
  fill: 0 | 0.5 | 1;
  size: number;
  testID?: string;
};

/** Outline star with a clipped filled overlay, so half stars need no extra SVG work. */
export function RatingStar({ fill, size, testID }: RatingStarProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ width: size, height: size }}>
      <Star size={size} color={colors.borderStrong} />
      {fill > 0 ? (
        <View
          testID={testID ? `${testID}-fill` : undefined}
          style={[StyleSheet.absoluteFill, styles.clip, { width: size * fill }]}
        >
          <Star size={size} color={colors.warning} fill={colors.warning} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
