import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { VenueListItem } from '@/services/demo/types';
import { useTheme } from '@/shared/theme';
import { Section } from '@/shared/ui/Section';
import { SkeletonList } from '@/shared/ui/Skeleton';
import { VenueCard } from '@/shared/ui/VenueCard';

import { openVenue } from './VenueCarousel';

export type PopularSectionProps = {
  venues: VenueListItem[] | undefined;
  loading: boolean;
  gutter: number;
};

const SKELETON_ROWS = 3;

/** Top-rated venues as full-width row cards. */
export function PopularSection({ venues, loading, gutter }: PopularSectionProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <Section
      title={t('home.popular.title')}
      action={{
        label: t('home.popular.seeAll'),
        accessibilityLabel: t('home.popular.seeAllA11y'),
        onPress: () => router.push('/discover'),
      }}
      style={{ paddingHorizontal: gutter, gap: spacing[3] }}
      testID="home-popular"
    >
      {loading || !venues ? (
        <SkeletonList count={SKELETON_ROWS} testID="home-popular-skeleton" />
      ) : (
        venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            distanceKm={venue.distanceKm}
            openNow={venue.openNow}
            variant="row"
            onPress={() => openVenue(venue.id)}
            testID={`home-popular-${venue.slug}`}
          />
        ))
      )}
    </Section>
  );
}
