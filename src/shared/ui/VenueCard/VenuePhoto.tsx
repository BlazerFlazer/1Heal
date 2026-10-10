import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

export type VenuePhotoProps = {
  uri: string | undefined;
  height: number;
  rating: string;
  tierLabel: string;
};

/** Card cover: photo over a skeleton tint, bottom scrim, tier pill (left) and rating pill (right). */
export function VenuePhoto({ uri, height, rating, tierLabel }: VenuePhotoProps) {
  const { colors, spacing, radii } = useTheme();
  const pill = {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    gap: spacing[1],
  };

  return (
    <View style={[styles.photo, { height, backgroundColor: colors.skeletonBase }]}>
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={200}
          style={StyleSheet.absoluteFill}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <LinearGradient
        colors={['transparent', colors.overlay]}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.pills, { padding: spacing[3] }]}>
        <View style={[styles.pill, pill]}>
          <Text variant="overline" color="primary">
            {tierLabel}
          </Text>
        </View>
        <View style={[styles.pill, pill]}>
          <Star size={13} color={colors.warning} fill={colors.warning} />
          <Text variant="label" style={styles.rating}>
            {rating}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', overflow: 'hidden' },
  pills: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center' },
  rating: { includeFontPadding: false },
});
