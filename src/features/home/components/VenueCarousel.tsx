import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { VenueListItem } from '@/services/demo/types';
import { useTheme } from '@/shared/theme';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Section, type SectionAction } from '@/shared/ui/Section';
import { SkeletonBox } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { VENUE_TILE_WIDTH, VenueCard } from '@/shared/ui/VenueCard';

export type VenueCarouselProps = {
  title: string;
  subtitle?: string;
  action?: SectionAction;
  venues: VenueListItem[] | undefined;
  loading: boolean;
  error: boolean;
  errorTitle: string;
  errorBody: string;
  onRetry: () => void;
  gutter: number;
  testID: string;
};

const TILE_HEIGHT = 236;
const SKELETON_COUNT = 2;

export function openVenue(id: string): void {
  router.push({ pathname: '/venue/[id]', params: { id } });
}

/** Horizontal carousel of venue tiles that bleeds to the screen edges. */
export function VenueCarousel({
  title,
  subtitle,
  action,
  venues,
  loading,
  error,
  errorTitle,
  errorBody,
  onRetry,
  gutter,
  testID,
}: VenueCarouselProps) {
  const { spacing } = useTheme();
  const rowStyle = { paddingHorizontal: gutter, gap: spacing[3] };

  let body;
  if (error && !venues) {
    body = (
      <ErrorState
        title={errorTitle}
        body={errorBody}
        onRetry={onRetry}
        style={{ paddingHorizontal: gutter }}
        testID={`${testID}-error`}
      />
    );
  } else if (loading || !venues) {
    body = (
      <View style={[styles.row, rowStyle]} testID={`${testID}-skeleton`}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <SkeletonBox key={index} width={VENUE_TILE_WIDTH} height={TILE_HEIGHT} radius="lg" />
        ))}
      </View>
    );
  } else {
    body = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={VENUE_TILE_WIDTH + spacing[3]}
        contentContainerStyle={[rowStyle, { paddingBottom: spacing[2] }]}
      >
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            distanceKm={venue.distanceKm}
            openNow={venue.openNow}
            variant="tile"
            onPress={() => openVenue(venue.id)}
            testID={`${testID}-${venue.slug}`}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View testID={testID} style={{ gap: spacing[2] }}>
      <View style={{ paddingHorizontal: gutter }}>
        <Section title={title} action={action} />
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', overflow: 'hidden' },
});
