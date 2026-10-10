import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { VenueListItem } from '@/services/demo/types';
import { useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SkeletonBox, SkeletonList, SkeletonText } from '@/shared/ui/Skeleton';
import { VenueCard } from '@/shared/ui/VenueCard';

export type VenueResultsProps = {
  venues: VenueListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onReset: () => void;
};

const SKELETON_CARDS = 3;

function openVenue(id: string): void {
  router.push({ pathname: '/venue/[id]', params: { id } });
}

function CardSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <SkeletonBox aria-hidden height={176} radius="lg" />
      <SkeletonText aria-hidden lines={2} width="70%" lastLineWidth="45%" />
    </View>
  );
}

/** Results area: card skeletons, error with retry, empty with reset, or the venue list. */
export function VenueResults({ venues, isLoading, isError, onRetry, onReset }: VenueResultsProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const gutter = { padding: spacing[4], paddingBottom: spacing[8] };

  if (venues === undefined && isLoading) {
    return (
      <SkeletonList
        count={SKELETON_CARDS}
        gap={6}
        renderItem={() => <CardSkeleton />}
        style={gutter}
        testID="discover-skeleton"
      />
    );
  }
  if (venues === undefined || isError) {
    return <ErrorState onRetry={onRetry} testID="discover-error" />;
  }
  if (venues.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('discover.empty.title')}
        body={t('discover.empty.body')}
        primaryAction={{ label: t('discover.empty.reset'), onPress: onReset }}
        accessibilityLiveRegion="polite"
        testID="discover-empty"
      />
    );
  }
  return (
    <FlashList
      data={venues}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <VenueCard
          venue={item}
          distanceKm={item.distanceKm}
          openNow={item.openNow}
          onPress={() => openVenue(item.id)}
          testID={`discover-venue-${item.slug}`}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing[4] }} />}
      contentContainerStyle={gutter}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.list}
      testID="discover-list"
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
});
