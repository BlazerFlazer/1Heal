import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Venue } from '@/services/demo/types';
import { useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

import { formatDistance, useVenueMeta } from './venueMeta';
import { VenuePhoto } from './VenuePhoto';

export type VenueCardVariant = 'row' | 'tile';

export type VenueCardProps = {
  venue: Venue;
  distanceKm?: number;
  openNow?: boolean;
  /** `tile`: 260pt vertical card for carousels; `row`: full-width list card. Defaults to `row`. */
  variant?: VenueCardVariant;
  onPress?: () => void;
  testID?: string;
};

export const VENUE_TILE_WIDTH = 260;
const PHOTO_HEIGHT: Record<VenueCardVariant, number> = { row: 176, tile: 148 };

/** Venue preview: photo with tier and rating, name, category, district, open state, distance. */
export function VenueCard({
  venue,
  distanceKm,
  openNow,
  variant = 'row',
  onPress,
  testID,
}: VenueCardProps) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { t } = useTranslation();
  const { locale } = useLocale();
  const meta = useVenueMeta(venue);
  const distance = distanceKm === undefined ? null : formatDistance(distanceKm, locale, t);
  const isTile = variant === 'tile';

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={onPress === undefined}
      dimWhenDisabled={false}
      accessibilityRole="button"
      accessibilityLabel={t('venue.card.a11y', {
        name: meta.name,
        category: meta.categoryName,
        district: meta.district,
        rating: meta.rating,
      })}
      style={[
        styles.card,
        theme.elevation(2),
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.lg,
          borderColor: colors.border,
        },
        isTile ? { width: VENUE_TILE_WIDTH } : null,
      ]}
    >
      <View style={[styles.clip, { borderRadius: radii.lg }]}>
        <VenuePhoto
          uri={venue.photos[0]}
          height={PHOTO_HEIGHT[variant]}
          rating={meta.rating}
          tierLabel={meta.tierLabel}
        />
        <View style={{ padding: spacing[4], paddingTop: spacing[3], gap: spacing[1] }}>
          <Text variant={isTile ? 'bodyStrong' : 'subtitle'} numberOfLines={1}>
            {meta.name}
          </Text>
          <View style={[styles.row, { gap: spacing[1] }]}>
            <CategoryIcon icon={meta.categoryIcon} size={15} />
            <Text variant="label" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {meta.categoryName}
            </Text>
            <Text variant="label" color="textDisabled">
              {'·'}
            </Text>
            <Text variant="label" color="textSecondary" numberOfLines={1} style={styles.shrink}>
              {meta.district}
            </Text>
          </View>
          <View style={[styles.row, { gap: spacing[3], marginTop: spacing[1] }]}>
            {openNow === undefined ? null : (
              <View style={[styles.row, { gap: spacing[2] }]}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: openNow ? colors.success : colors.textDisabled },
                  ]}
                />
                <Text variant="caption" color={openNow ? 'success' : 'textSecondary'}>
                  {openNow ? t('venue.card.open') : t('venue.card.closed')}
                </Text>
              </View>
            )}
            {distance === null ? null : (
              <View style={[styles.row, { gap: spacing[1] }]}>
                <MapPin size={13} color={colors.textSecondary} />
                <Text variant="caption" color="textSecondary">
                  {distance}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  clip: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
