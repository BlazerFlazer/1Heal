import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CalendarClock, ChevronRight, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BookingRecord } from '@/domain/membership';
import { text } from '@/services/demo/catalog';
import { useFormatters, useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';

import { countdown, describeBooking } from '../upcoming';

export type NextBookingCardProps = { booking: BookingRecord | undefined; now: number };

const PHOTO_SIZE = 76;

/** "Next booking": venue photo, class, when (with a countdown when close) → booking details. */
export function NextBookingCard({ booking, now }: NextBookingCardProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatRelativeDay, formatTime } = useFormatters();
  const { colors, spacing, radii } = useTheme();

  if (!booking) {
    return (
      <Section title={t('home.nextBooking.title')} testID="home-next-booking">
        <Card radius="lg" padding={2}>
          <EmptyState
            icon={CalendarClock}
            title={t('home.nextBooking.empty.title')}
            body={t('home.nextBooking.empty.body')}
            primaryAction={{
              label: t('home.nextBooking.empty.cta'),
              onPress: () => router.push('/discover'),
            }}
            testID="home-next-booking-empty"
          />
        </Card>
      </Section>
    );
  }

  const { venue, className } = describeBooking(booking, locale);
  const start = new Date(booking.startsAt);
  const dayTime = t('home.nextBooking.dayTime', {
    day: formatRelativeDay(start, new Date(now)),
    time: formatTime(start),
  });
  const soon = countdown(booking.startsAt, now);
  const name = className ?? t('home.nextBooking.dropIn');
  const venueName = venue ? text(venue.name, locale) : '';

  return (
    <Section title={t('home.nextBooking.title')} testID="home-next-booking">
      <Card
        radius="lg"
        elevation={1}
        padding={3}
        onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
        accessibilityLabel={t('home.nextBooking.a11y', {
          name,
          venue: venueName,
          when: soon ? t(`home.nextBooking.${soon.key}`, { count: soon.count }) : dayTime,
        })}
        testID="home-next-booking-card"
      >
        <View style={[styles.row, { gap: spacing[3] }]}>
          <Image
            source={venue?.photos[0] ? { uri: venue.photos[0] } : undefined}
            contentFit="cover"
            transition={200}
            accessible={false}
            style={[styles.photo, { borderRadius: radii.md, backgroundColor: colors.skeletonBase }]}
          />
          <View style={[styles.info, { gap: spacing[1] }]}>
            {soon ? (
              <Badge
                tone="success"
                size="sm"
                label={t(`home.nextBooking.${soon.key}`, { count: soon.count })}
              />
            ) : null}
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            <View style={[styles.meta, { gap: spacing[1] }]}>
              <MapPin size={spacing[4]} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.info}>
                {venueName}
              </Text>
            </View>
            <Text variant="label" color="primary">
              {dayTime}
            </Text>
          </View>
          <ChevronRight size={spacing[5]} color={colors.textDisabled} />
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  info: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
