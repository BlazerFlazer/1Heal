import { LayoutGrid } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { Category } from '@/services/demo/types';
import { useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { categoryIcon } from '@/shared/ui/CategoryIcon';
import { Chip } from '@/shared/ui/Chip';

export type CategoryChipsProps = {
  categories: readonly Category[];
  /** Selected category slug; null = all. */
  value: string | null;
  onChange: (slug: string | null) => void;
};

/** Horizontal category filter: "All" first, then every catalog category with its icon. */
export function CategoryChips({ categories, value, onChange }: CategoryChipsProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { spacing } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap: spacing[2], paddingHorizontal: spacing[4] }]}
      testID="discover-categories"
    >
      <Chip
        label={t('discover.categories.all')}
        leftIcon={LayoutGrid}
        selected={value === null}
        onPress={() => onChange(null)}
        testID="discover-category-all"
      />
      {categories.map((category) => (
        <Chip
          key={category.id}
          label={text(category.name, locale)}
          leftIcon={categoryIcon(category.icon)}
          selected={value === category.slug}
          onPress={() => onChange(value === category.slug ? null : category.slug)}
          testID={`discover-category-${category.slug}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center' },
});
