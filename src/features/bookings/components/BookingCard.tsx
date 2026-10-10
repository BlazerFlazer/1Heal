import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { BookingRecord } from '@/domain/membership';
import { text } from '@/services/demo/catalog';
import { useFormatters, useLocale } from '@/shared/i18n';
import { useReduceMotion, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

import { bookingPhase, describeBooking } from '../bookingView';
import { STATUS_A11Y_KEYS, StatusBadge } from './StatusBadge';

type Props = {
  booking: BookingRecord;
  now: number;
  /** History rows show the date next to the time; upcoming rows sit under a day header. */
  showDate?: boolean;
  /** Position in the list, used to stagger the entrance. */
  index?: number;
};

const MAX_STAGGER = 6;

/** One booking: venue photo, venue and class names, time and status. Opens the detail screen. */
export function BookingCard({ booking, now, showDate = false, index = 0 }: Props) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const fmt = useFormatters();
  const { colors, spacing, radii, motion } = useTheme();
  const reduceMotion = useReduceMotion();

  const view = describeBooking(booking);
  const phase = bookingPhase(booking, now);
  const venueName = view.venue ? text(view.venue.name, locale) : t('bookings.unknownVenue');
  const title = view.classTemplate ? text(view.classTemplate.name, locale) : t('bookings.dropIn');
  const start = new Date(booking.startsAt);
  const time = fmt.formatTimeRange(start, new Date(view.endsAt));
  const when = showDate ? t('bookings.dateTime', { date: fmt.formatDate(start), time }) : time;
  const photo = view.venue?.photos[0];
  const thumb = spacing[16] + spacing[2];
  const entering = reduceMotion
    ? undefined
    : FadeInDown.duration(motion.durations.slow).delay(Math.min(index, MAX_STAGGER) * 50);

  return (
    <Animated.View entering={entering}>
      <Card
        radius="lg"
        padding={3}
        onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
        accessibilityLabel={t('bookings.card.a11y', {
          venue: venueName,
          title,
          when,
          status: t(STATUS_A11Y_KEYS[phase]),
        })}
        accessibilityHint={t('bookings.card.hint')}
        testID={`booking-card-${booking.id}`}
      >
        <View style={[styles.row, { gap: spacing[3] }]}>
          <Image
            source={photo ? { uri: photo } : null}
            contentFit="cover"
            transition={200}
            accessible={false}
            style={{
              width: thumb,
              height: thumb,
              borderRadius: radii.md,
              backgroundColor: colors.skeletonBase,
            }}
          />
          <View style={[styles.body, { gap: spacing[1] }]}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {venueName}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.row, { gap: spacing[1] }]}>
              <Clock size={spacing[4]} color={colors.textSecondary} />
              <Text variant="label" numberOfLines={1} style={styles.shrink}>
                {when}
              </Text>
            </View>
            <View style={[styles.row, { gap: spacing[2], marginTop: spacing[1] }]}>
              <StatusBadge phase={phase} />
              {phase === 'late_cancelled' ? (
                <Text
                  variant="caption"
                  color="textSecondary"
                  numberOfLines={1}
                  style={styles.shrink}
                >
                  {t('bookings.status.visitUsed')}
                </Text>
              ) : null}
            </View>
          </View>
          <ChevronRight size={spacing[5]} color={colors.textDisabled} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
});
