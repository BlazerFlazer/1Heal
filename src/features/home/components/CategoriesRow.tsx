import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { Category } from '@/services/demo/types';
import { useLocale } from '@/shared/i18n';
import { MIN_TOUCH, useTheme } from '@/shared/theme';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { PressableScale } from '@/shared/ui/Pressable';
import { Section } from '@/shared/ui/Section';
import { SkeletonCircle } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

export type CategoriesRowProps = {
  categories: Category[] | undefined;
  loading: boolean;
  gutter: number;
};

const TILE_WIDTH = 76;
const SKELETON_COUNT = 5;

/** Round category tiles in a horizontal carousel; a tap opens Discover filtered by category. */
export function CategoriesRow({ categories, loading, gutter }: CategoriesRowProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const circle = spacing[16];
  const rowStyle = { paddingHorizontal: gutter, gap: spacing[3] };

  return (
    <View testID="home-categories" style={{ gap: spacing[2] }}>
      <Section title={t('home.categories.title')} style={{ paddingHorizontal: gutter }} />
      {loading || !categories ? (
        <View style={[styles.row, rowStyle]} testID="home-categories-skeleton">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <View key={index} style={[styles.tile, { gap: spacing[2] }]}>
              <SkeletonCircle size={circle} />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rowStyle}
        >
          {categories.map((category) => {
            const name = text(category.name, locale);
            return (
              <PressableScale
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={t('home.categories.a11y', { name })}
                onPress={() =>
                  router.push({ pathname: '/discover', params: { category: category.slug } })
                }
                hapticsEnabled
                testID={`home-category-${category.slug}`}
                style={[styles.tile, { gap: spacing[2] }]}
              >
                <View
                  style={[
                    styles.circle,
                    {
                      width: circle,
                      height: circle,
                      borderRadius: radii.full,
                      backgroundColor: colors.primarySubtle,
                    },
                  ]}
                >
                  <CategoryIcon
                    icon={category.icon}
                    size={spacing[6] + spacing[1]}
                    color={colors.primary}
                  />
                </View>
                <Text variant="caption" align="center" numberOfLines={2}>
                  {name}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tile: { width: TILE_WIDTH, alignItems: 'center', minHeight: MIN_TOUCH },
  circle: { alignItems: 'center', justifyContent: 'center' },
});
