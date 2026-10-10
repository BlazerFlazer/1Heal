import { Clock, MapPin, ShieldCheck, Star } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CITY_CENTER, distanceKm, isOpenAt } from '@/services/demo/catalog';
import type { Venue } from '@/services/demo/types';
import { useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { Text } from '@/shared/ui/Text';
import { formatDistance, useVenueMeta } from '@/shared/ui/VenueCard';

import { formatSlots, slotsOn } from '../hours';

export type VenueSummaryProps = {
  venue: Venue;
  now: Date;
};

/** Title block: category, name, rating, district and distance, open state with today's hours. */
export function VenueSummary({ venue, now }: VenueSummaryProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const meta = useVenueMeta(venue);
  const open = isOpenAt(venue, now);
  const today = slotsOn(venue, now);
  const km = distanceKm(CITY_CENTER.lat, CITY_CENTER.lng, venue.lat, venue.lng);

  return (
    <View style={{ gap: spacing[3] }} testID="venue-summary">
      <View style={[styles.row, { gap: spacing[2] }]}>
        <CategoryIcon icon={meta.categoryIcon} size={16} />
        <Text variant="label" color="primary">
          {meta.categoryName}
        </Text>
      </View>
      <Text variant="display" accessibilityRole="header">
        {meta.name}
      </Text>
      <View style={[styles.row, styles.wrap, { gap: spacing[3] }]}>
        <View
          style={[styles.row, { gap: spacing[1] }]}
          accessible
          accessibilityLabel={t('venue.summary.ratingLabel', { value: meta.rating })}
        >
          <Star size={16} color={colors.warning} fill={colors.warning} />
          <Text variant="bodyStrong">{meta.rating}</Text>
          <Text variant="body" color="textSecondary">
            {t('venue.summary.reviews', { count: venue.ratingCount })}
          </Text>
        </View>
        <View style={[styles.row, { gap: spacing[1] }]}>
          <MapPin size={16} color={colors.textSecondary} />
          <Text variant="body" color="textSecondary">
            {meta.district}
          </Text>
          <Text variant="body" color="textDisabled">
            {'·'}
          </Text>
          <Text variant="body" color="textSecondary">
            {formatDistance(km, locale, t)}
          </Text>
        </View>
      </View>
      <View style={[styles.row, { gap: spacing[2] }]}>
        <Clock size={16} color={open ? colors.success : colors.textSecondary} />
        <Text variant="bodyStrong" color={open ? 'success' : 'textSecondary'}>
          {open ? t('venue.card.open') : t('venue.card.closed')}
        </Text>
        <Text variant="body" color="textSecondary">
          {today.length > 0
            ? t('venue.summary.todayHours', { hours: formatSlots(today) })
            : t('venue.summary.closedToday')}
        </Text>
      </View>
      <View
        style={[
          styles.row,
          styles.tier,
          { gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
          { backgroundColor: colors.primarySubtle, borderRadius: radii.full },
        ]}
        testID="venue-tier"
      >
        <ShieldCheck size={16} color={colors.onPrimarySubtle} />
        <Text variant="label" color="onPrimarySubtle">
          {t(`venue.tier.info.${venue.tier}`)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  tier: { alignSelf: 'flex-start' },
});
