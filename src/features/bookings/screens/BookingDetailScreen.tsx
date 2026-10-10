import { router } from 'expo-router';
import { ArrowLeft, CalendarX2, MapPin, Navigation, Store } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import { useMembership } from '@/services/membership/useMembership';
import { useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { SkeletonBox, SkeletonText } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';
import { useNow } from '@/shared/utils/useNow';

import { bookingPhase, describeBooking, directionsUrl } from '../bookingView';
import { BookingHero } from '../components/BookingHero';
import { BookingInfoCard } from '../components/BookingInfoCard';
import { CancellationCard } from '../components/CancellationCard';
import { CheckInHintCard } from '../components/CheckInHintCard';
import { useMembershipHydrated } from '../useMembershipHydrated';

/** Deep links have no history, so "back" falls back to the bookings tab. */
function leave(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/bookings');
}

function BackHeader() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing[2] }}>
      <IconButton
        icon={ArrowLeft}
        accessibilityLabel={t('common.actions.back')}
        onPress={leave}
        testID="booking-back"
      />
    </View>
  );
}

/** One booking: photo, when and where, directions, check-in hint and cancellation. */
export function BookingDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const toast = useToast();
  const { bookings } = useMembership();
  const hydrated = useMembershipHydrated();
  const now = useNow(30_000);
  const booking = bookings.find((b) => b.id === id);

  if (!hydrated || !booking) {
    return (
      <Screen header={<BackHeader />} contentStyle={{ gap: spacing[4] }} testID="booking-detail">
        {hydrated ? (
          <EmptyState
            icon={CalendarX2}
            title={t('bookings.detail.notFound.title')}
            body={t('bookings.detail.notFound.body')}
            primaryAction={{
              label: t('bookings.detail.notFound.cta'),
              onPress: () => router.replace('/bookings'),
            }}
            testID="booking-not-found"
          />
        ) : (
          <View style={{ gap: spacing[4] }} testID="booking-loading">
            <SkeletonBox aria-hidden height={spacing[16] * 3} radius="lg" />
            <SkeletonText aria-hidden lines={4} lastLineWidth="50%" />
          </View>
        )}
      </Screen>
    );
  }

  const view = describeBooking(booking);
  const { venue } = view;
  const phase = bookingPhase(booking, now);
  const venueName = venue ? text(venue.name, locale) : t('bookings.unknownVenue');
  const active = phase === 'upcoming' || phase === 'ongoing';

  const openDirections = () => {
    if (!venue) return;
    Linking.openURL(directionsUrl(venue)).catch(() =>
      toast.show({ message: t('bookings.detail.mapsError'), tone: 'error' }),
    );
  };

  return (
    <Screen scroll padding={0} edges={['bottom']} testID="booking-detail">
      <BookingHero photo={venue?.photos[0]} phase={phase} onBack={leave} />
      <View
        style={[
          styles.sheet,
          {
            marginTop: -spacing[6],
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            backgroundColor: colors.background,
            padding: spacing[4],
            paddingTop: spacing[6],
            paddingBottom: spacing[10],
            gap: spacing[5],
          },
        ]}
      >
        <OfflineBanner testID="booking-offline" />
        <View style={{ gap: spacing[1] }}>
          <Text variant="title" accessibilityRole="header">
            {venueName}
          </Text>
          {venue ? (
            <View style={[styles.row, { gap: spacing[1] }]}>
              <MapPin size={spacing[4]} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary" style={styles.shrink}>
                {text(venue.street, locale)}
              </Text>
            </View>
          ) : null}
        </View>
        <BookingInfoCard view={view} />
        {venue ? (
          <View style={{ gap: spacing[3] }}>
            <Button
              label={t('bookings.detail.directions')}
              leftIcon={Navigation}
              onPress={openDirections}
              testID="booking-directions"
            />
            <Button
              label={t('bookings.detail.openVenue')}
              leftIcon={Store}
              variant="secondary"
              onPress={() => router.push({ pathname: '/venue/[id]', params: { id: venue.id } })}
              testID="booking-open-venue"
            />
          </View>
        ) : null}
        {active ? <CheckInHintCard /> : null}
        {phase === 'upcoming' ? (
          <CancellationCard
            booking={booking}
            windowMin={venue?.cancellationWindowMin ?? 0}
            now={now}
          />
        ) : null}
        {phase === 'late_cancelled' ? (
          <Text variant="body" color="textSecondary" testID="booking-late-note">
            {t('bookings.status.lateCancelledNote')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
});
