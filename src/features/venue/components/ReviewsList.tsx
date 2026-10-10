import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Review } from '@/services/demo/types';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Rating } from '@/shared/ui/Rating';
import { Text } from '@/shared/ui/Text';
import { formatRating } from '@/shared/ui/VenueCard';

const MAX_REVIEWS = 4;

/** Average score with its basis, then the latest reviews. */
export function ReviewsList({ reviews }: { reviews: readonly Review[] }) {
  const { t } = useTranslation();
  const f = useFormatters();
  const { colors, spacing, radii } = useTheme();

  if (reviews.length === 0) {
    return (
      <Text variant="body" color="textSecondary">
        {t('venue.reviews.empty')}
      </Text>
    );
  }
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const averageText = formatRating(average, f.locale);

  return (
    <View style={{ gap: spacing[3] }} testID="venue-reviews">
      <View style={[styles.row, { gap: spacing[4] }]}>
        <Text variant="display">{averageText}</Text>
        <View style={{ gap: spacing[1] }}>
          <Rating
            value={average}
            readOnly
            size="md"
            accessibilityLabel={t('venue.reviews.ratingLabel', { value: averageText })}
          />
          <Text variant="caption" color="textSecondary">
            {t('venue.reviews.basedOn', { count: reviews.length })}
          </Text>
        </View>
      </View>
      {reviews.slice(0, MAX_REVIEWS).map((review) => (
        <View
          key={review.id}
          style={[
            { gap: spacing[2], padding: spacing[4], borderRadius: radii.md },
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={[styles.row, { gap: spacing[3] }]}>
            <Avatar name={review.author} size="sm" accessibilityLabel={review.author} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{review.author}</Text>
              <Text variant="caption" color="textSecondary">
                {f.formatDate(new Date(review.createdAt), 'shortYear')}
              </Text>
            </View>
            <Rating
              value={review.rating}
              readOnly
              size="sm"
              accessibilityLabel={t('venue.reviews.ratingLabel', { value: review.rating })}
            />
          </View>
          <Text variant="body">{review.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
