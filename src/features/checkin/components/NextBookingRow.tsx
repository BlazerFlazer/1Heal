import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BookingRecord } from '@/domain/membership';
import { getClasses, getVenue, text } from '@/services/demo/catalog';
import { useFormatters, useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

const PHOTO_SIZE = 56;

/** The member's next confirmed, unfinished booking. */
export function nextBooking(bookings: readonly BookingRecord[], now: number) {
  return bookings
    .filter((booking) => booking.status === 'confirmed' && booking.endsAt > now)
    .sort((a, b) => a.startsAt - b.startsAt)[0];
}

export type NextBookingRowProps = { booking: BookingRecord; now: number };

/** Compact "next booking" card under the pass; opens the booking details. */
export function NextBookingRow({ booking, now }: NextBookingRowProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatRelativeDay, formatTime } = useFormatters();
  const { colors, spacing, radii } = useTheme();
  const venue = getVenue(booking.venueId);
  const classId = booking.sessionId?.split('@')[0];
  const template = classId
    ? getClasses(booking.venueId).find((item) => item.id === classId)
    : undefined;
  const name = template ? text(template.name, locale) : t('qr.nextBooking.dropIn');
  const venueName = venue ? text(venue.name, locale) : '';
  const start = new Date(booking.startsAt);
  const when = `${formatRelativeDay(start, new Date(now))}, ${formatTime(start)}`;

  return (
    <View style={{ gap: spacing[2] }}>
      <Text variant="subtitle" accessibilityRole="header">
        {t('qr.nextBooking.title')}
      </Text>
      <Card
        radius="lg"
        elevation={1}
        padding={3}
        onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
        accessibilityLabel={t('qr.nextBooking.a11y', { name, venue: venueName, when })}
        testID="qr-next-booking"
      >
        <View style={[styles.row, { gap: spacing[3] }]}>
          <Image
            source={venue?.photos[0] ? { uri: venue.photos[0] } : undefined}
            contentFit="cover"
            transition={200}
            accessible={false}
            style={[styles.photo, { borderRadius: radii.sm, backgroundColor: colors.skeletonBase }]}
          />
          <View style={styles.info}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {venueName}
            </Text>
            <Text variant="label" color="primary">
              {when}
            </Text>
          </View>
          <ChevronRight size={spacing[5]} color={colors.textDisabled} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  info: { flex: 1 },
});
