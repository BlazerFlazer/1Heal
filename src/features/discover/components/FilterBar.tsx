import { ArrowUpDown, Clock, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import type { VenueSort } from '@/services/demo/types';
import { useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';

export type FilterBarProps = {
  openNow: boolean;
  onToggleOpenNow: () => void;
  /** Shown only with an active subscription. */
  showInPlan: boolean;
  inPlan: boolean;
  onToggleInPlan: () => void;
  sort: VenueSort;
  onOpenSort: () => void;
};

/** Second filter row: open now, "in my plan" (members only) and the sort switcher. */
export function FilterBar({
  openNow,
  onToggleOpenNow,
  showInPlan,
  inPlan,
  onToggleInPlan,
  sort,
  onOpenSort,
}: FilterBarProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const sortName = t(`discover.sort.${sort}`);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap: spacing[2], paddingHorizontal: spacing[4] }]}
      testID="discover-filters"
    >
      <Chip
        size="sm"
        label={sortName}
        accessibilityLabel={t('discover.filters.sortLabel', { value: sortName })}
        leftIcon={ArrowUpDown}
        onPress={onOpenSort}
        testID="discover-sort-open"
      />
      <Chip
        size="sm"
        label={t('discover.filters.openNow')}
        leftIcon={Clock}
        selected={openNow}
        onPress={onToggleOpenNow}
        testID="discover-open-now"
      />
      {showInPlan ? (
        <Chip
          size="sm"
          label={t('discover.filters.inPlan')}
          leftIcon={ShieldCheck}
          selected={inPlan}
          onPress={onToggleInPlan}
          testID="discover-in-plan"
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center' },
});
