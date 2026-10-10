import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { VenueSort } from '@/services/demo/types';
import { useCategories, useVenues } from '@/services/demo/useCatalog';
import { useMembership } from '@/services/membership/useMembership';
import { useTheme } from '@/shared/theme';
import { Input } from '@/shared/ui/Input';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import { CategoryChips } from '../components/CategoryChips';
import { FilterBar } from '../components/FilterBar';
import { SortSheet } from '../components/SortSheet';
import { VenueResults } from '../components/VenueResults';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '../useDebouncedValue';

export type DiscoverScreenProps = {
  /** Category slug from the route (`/discover?category=yoga`), preselected on arrival. */
  category?: string;
};

/** Venue catalogue: sticky search and filters above a virtualised list of venue cards. */
export function DiscoverScreen({ category: routeCategory }: DiscoverScreenProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const membership = useMembership();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(routeCategory ?? null);
  const [seenRouteCategory, setSeenRouteCategory] = useState(routeCategory);
  const [openNow, setOpenNow] = useState(false);
  const [inPlan, setInPlan] = useState(false);
  const [sort, setSort] = useState<VenueSort>('recommended');
  const [sortOpen, setSortOpen] = useState(false);
  const search = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  if (routeCategory !== seenRouteCategory) {
    // Derived state: a new deep-link category replaces the current selection.
    setSeenRouteCategory(routeCategory);
    setCategory(routeCategory ?? null);
  }

  const maxTier = membership.active && membership.plan ? membership.plan.maxVenueTier : null;
  const categories = useCategories();
  const venues = useVenues({
    query: search,
    category,
    openNow,
    maxTier: inPlan ? maxTier : null,
    sort,
  });
  const count = venues.data?.length;

  const resetFilters = () => {
    setQuery('');
    setCategory(null);
    setOpenNow(false);
    setInPlan(false);
    setSort('recommended');
  };

  return (
    <Screen
      edges={['top']}
      padding={0}
      header={<OfflineBanner testID="discover-offline" />}
      testID="discover"
    >
      <View
        style={[
          styles.header,
          { gap: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[3] },
          { borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={{ paddingHorizontal: spacing[4], gap: spacing[1] }}>
          <Text variant="display" accessibilityRole="header">
            {t('discover.title')}
          </Text>
          <Text variant="body" color="textSecondary">
            {t('discover.subtitle')}
          </Text>
        </View>
        <View style={{ paddingHorizontal: spacing[4] }}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={t('discover.search.placeholder')}
            accessibilityLabel={t('discover.search.label')}
            leftIcon={Search}
            clearable
            clearLabel={t('discover.search.clear')}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            testID="discover-search"
          />
        </View>
        <CategoryChips categories={categories.data ?? []} value={category} onChange={setCategory} />
        <FilterBar
          openNow={openNow}
          onToggleOpenNow={() => setOpenNow((value) => !value)}
          showInPlan={maxTier !== null}
          inPlan={inPlan}
          onToggleInPlan={() => setInPlan((value) => !value)}
          sort={sort}
          onOpenSort={() => setSortOpen(true)}
        />
        {count === undefined ? null : (
          <Text
            variant="label"
            color="textSecondary"
            accessibilityLiveRegion="polite"
            style={{ paddingHorizontal: spacing[4] }}
            testID="discover-count"
          >
            {t('discover.results', { count })}
          </Text>
        )}
      </View>
      <VenueResults
        venues={venues.data}
        isLoading={venues.isPending}
        isError={venues.isError}
        onRetry={() => void venues.refetch()}
        onReset={resetFilters}
      />
      <SortSheet
        visible={sortOpen}
        value={sort}
        onChange={setSort}
        onClose={() => setSortOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
});
