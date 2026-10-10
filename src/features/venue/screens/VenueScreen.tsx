import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getVenue, text } from '@/services/demo/catalog';
import type { ClassSession, Venue } from '@/services/demo/types';
import { useVenueDetails } from '@/services/demo/useCatalog';
import { useMembership } from '@/services/membership/useMembership';
import { BRAND_NAME } from '@/shared/config/brand';
import { useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { useNow } from '@/shared/utils/useNow';

import { BookingSheet } from '../booking/BookingSheet';
import { useBookingFlow } from '../booking/useBookingFlow';
import { AmenityChips } from '../components/AmenityChips';
import { DropInCard } from '../components/DropInCard';
import { HoursTable } from '../components/HoursTable';
import { LocationCard } from '../components/LocationCard';
import { PhotoGallery } from '../components/PhotoGallery';
import { ReviewsList } from '../components/ReviewsList';
import { Timetable } from '../components/Timetable';
import { TrainersRow } from '../components/TrainersRow';
import { VenueError, VenueSkeleton, leaveVenue } from '../components/VenueStates';
import { VenueSummary } from '../components/VenueSummary';

const DROP_IN_MINUTES = 60;

export type VenueScreenProps = { id: string };

/** Venue page: gallery, summary, booking (classes and drop-in), details, reviews, location. */
export function VenueScreen({ id }: VenueScreenProps) {
  // Unknown ids never reach the query: the demo repository throws for them outside the promise.
  if (getVenue(id) === undefined) {
    return <VenueError notFound onRetry={() => undefined} />;
  }
  return <KnownVenue id={id} />;
}

function KnownVenue({ id }: VenueScreenProps) {
  const details = useVenueDetails(id);
  const flow = useBookingFlow(details.data?.venue);

  if (details.isPending) {
    return <VenueSkeleton />;
  }
  if (details.isError) {
    return <VenueError notFound={false} onRetry={() => void details.refetch()} />;
  }
  const { venue, trainers, reviews } = details.data;

  return (
    <VenueContent venue={venue} trainers={trainers} reviews={reviews} flow={flow}>
      <BookingSheet venue={venue} flow={flow} />
    </VenueContent>
  );
}

type VenueContentProps = {
  venue: Venue;
  trainers: Parameters<typeof TrainersRow>[0]['trainers'];
  reviews: Parameters<typeof ReviewsList>[0]['reviews'];
  flow: ReturnType<typeof useBookingFlow>;
  children: ReactNode;
};

function VenueContent({ venue, trainers, reviews, flow, children }: VenueContentProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const membership = useMembership();
  const now = new Date(useNow());

  const isBooked = (sessionId: string) =>
    membership.bookings.some((b) => b.sessionId === sessionId && b.status === 'confirmed');

  const bookClass = (session: ClassSession, title: string) =>
    flow.open({
      kind: 'class',
      title,
      sessionId: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      spotsLeft: session.capacity - session.takenByOthers,
    });

  const bookDropIn = (startsAt: Date) =>
    flow.open({
      kind: 'dropIn',
      title: '',
      sessionId: null,
      startsAt: startsAt.getTime(),
      endsAt: startsAt.getTime() + DROP_IN_MINUTES * 60_000,
      spotsLeft: 1,
    });

  const share = () =>
    void Share.share({
      message: t('venue.gallery.shareMessage', {
        name: text(venue.name, locale),
        address: text(venue.address, locale),
        brand: BRAND_NAME,
      }),
    }).catch(() => undefined);

  return (
    <Screen
      scroll
      edges={[]}
      padding={0}
      header={<OfflineBanner testID="venue-offline" />}
      testID="venue"
    >
      <PhotoGallery photos={venue.photos} onBack={leaveVenue} onShare={share} />
      <View
        style={[
          styles.sheet,
          {
            marginTop: -spacing[6],
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            backgroundColor: colors.background,
            paddingTop: spacing[6],
            paddingBottom: insets.bottom + spacing[10],
            gap: spacing[8],
          },
        ]}
      >
        <Gutter>
          <VenueSummary venue={venue} now={now} />
        </Gutter>
        <Gutter>
          <DropInCard venue={venue} now={now} onBook={bookDropIn} />
        </Gutter>
        <Gutter>
          <Section title={t('venue.schedule.title')} testID="venue-schedule">
            <Timetable venueId={venue.id} now={now} isBooked={isBooked} onBook={bookClass} />
          </Section>
        </Gutter>
        <Gutter>
          <Section title={t('venue.about')}>
            <Text variant="body" color="textSecondary">
              {text(venue.description, locale)}
            </Text>
          </Section>
        </Gutter>
        {venue.amenities.length > 0 ? (
          <Gutter>
            <Section title={t('venue.amenities.title')}>
              <AmenityChips amenities={venue.amenities} />
            </Section>
          </Gutter>
        ) : null}
        {trainers.length > 0 ? (
          <View style={{ gap: spacing[3] }}>
            <Gutter>
              <Text variant="subtitle" accessibilityRole="header">
                {t('venue.trainers.title')}
              </Text>
            </Gutter>
            <TrainersRow trainers={trainers} />
          </View>
        ) : null}
        <Gutter>
          <Section title={t('venue.reviews.title')}>
            <ReviewsList reviews={reviews} />
          </Section>
        </Gutter>
        <Gutter>
          <Section title={t('venue.hours.title')}>
            <HoursTable venue={venue} now={now} />
          </Section>
        </Gutter>
        <Gutter>
          <Section title={t('venue.location.title')}>
            <LocationCard venue={venue} />
          </Section>
        </Gutter>
      </View>
      {children}
    </Screen>
  );
}

function Gutter({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ paddingHorizontal: spacing[4] }}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: { flexGrow: 1 },
});
