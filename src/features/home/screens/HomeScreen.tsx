import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useVenues } from '@/services/demo/useCatalog';
import { useMembership } from '@/services/membership/useMembership';
import { palette, useTheme } from '@/shared/theme';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { useNow } from '@/shared/utils/useNow';

import { CategoriesRow } from '../components/CategoriesRow';
import { HomeHeader } from '../components/HomeHeader';
import { NextBookingCard } from '../components/NextBookingCard';
import { PopularSection } from '../components/PopularSection';
import { VenueCarousel } from '../components/VenueCarousel';
import { nextConfirmedBooking } from '../upcoming';

const NEARBY_COUNT = 8;
const POPULAR_COUNT = 5;
const INCLUDED_COUNT = 8;
const STAGGER_MS = 70;

/** Member home: brand header with membership, next booking, categories and venue carousels. */
export function HomeScreen() {
  const { t } = useTranslation();
  const { colors, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const membership = useMembership();
  const categories = useCategories();
  const nearby = useVenues({ sort: 'distance' });
  const popular = useVenues({ sort: 'rating' });
  const included = useVenues({ maxTier: membership.plan?.maxVenueTier ?? null, sort: 'rating' });
  const [refreshing, setRefreshing] = useState(false);
  const gutter = spacing[5];
  const subscribed = membership.active && membership.plan !== null;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([categories.refetch(), nearby.refetch(), popular.refetch()]);
    setRefreshing(false);
  };

  const enter = (index: number) => FadeInDown.duration(420).delay(index * STAGGER_MS);
  const seeAll = (label: string, a11y: string) => ({
    label,
    accessibilityLabel: a11y,
    onPress: () => router.push('/discover'),
  });

  return (
    <View testID="home" style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={{
          height: insets.top,
          backgroundColor: isDark ? colors.surfaceElevated : palette.green[100],
        }}
      />
      <OfflineBanner testID="home-offline" />
      <ScrollView
        testID="home-content"
        style={styles.flex}
        contentContainerStyle={{ gap: spacing[8], paddingBottom: spacing[10] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <HomeHeader
          membership={membership}
          venueCount={nearby.data?.length}
          now={now}
          gutter={gutter}
        />
        {subscribed ? (
          <Animated.View entering={enter(1)} style={{ paddingHorizontal: gutter }}>
            <NextBookingCard booking={nextConfirmedBooking(membership.bookings, now)} now={now} />
          </Animated.View>
        ) : null}
        <Animated.View entering={enter(2)}>
          <CategoriesRow
            categories={categories.data}
            loading={categories.isPending}
            gutter={gutter}
          />
        </Animated.View>
        <Animated.View entering={enter(3)}>
          <VenueCarousel
            title={t('home.nearby.title')}
            action={seeAll(t('home.nearby.seeAll'), t('home.nearby.seeAllA11y'))}
            venues={nearby.data?.slice(0, NEARBY_COUNT)}
            loading={nearby.isPending}
            error={nearby.isError}
            errorTitle={t('home.error.title')}
            errorBody={t('home.error.body')}
            onRetry={() => void nearby.refetch()}
            gutter={gutter}
            testID="home-nearby"
          />
        </Animated.View>
        {subscribed ? (
          <Animated.View entering={enter(4)}>
            <VenueCarousel
              title={t('home.included.title')}
              subtitle={
                included.data
                  ? t('home.included.count', { count: included.data.length })
                  : undefined
              }
              venues={included.data?.slice(0, INCLUDED_COUNT)}
              loading={included.isPending}
              error={included.isError}
              errorTitle={t('home.error.title')}
              errorBody={t('home.error.body')}
              onRetry={() => void included.refetch()}
              gutter={gutter}
              testID="home-included"
            />
          </Animated.View>
        ) : null}
        <Animated.View entering={enter(5)}>
          <PopularSection
            venues={popular.data?.slice(0, POPULAR_COUNT)}
            loading={popular.isPending}
            gutter={gutter}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
