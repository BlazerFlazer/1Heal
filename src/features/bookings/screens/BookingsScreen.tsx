import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMembership } from '@/services/membership/useMembership';
import { useTheme } from '@/shared/theme';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';
import { useNow } from '@/shared/utils/useNow';

import { splitBookings } from '../bookingView';
import { HistoryList, UpcomingList } from '../components/BookingLists';
import { BookingsSkeleton } from '../components/BookingsSkeleton';
import { VisitsPill } from '../components/VisitsPill';
import { useMembershipHydrated } from '../useMembershipHydrated';

export type BookingsTab = 'upcoming' | 'history';

/** My bookings: upcoming visits grouped by day, and the history of visited or cancelled ones. */
export function BookingsScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [tab, setTab] = useState<BookingsTab>('upcoming');
  const membership = useMembership();
  const hydrated = useMembershipHydrated();
  const now = useNow();
  const { upcoming, history } = splitBookings(membership.bookings, now);

  const tabs: readonly TabItem<BookingsTab>[] = [
    {
      key: 'upcoming',
      label: t('bookings.tabs.upcoming'),
      badge: upcoming.length > 0 ? upcoming.length : undefined,
    },
    { key: 'history', label: t('bookings.tabs.history') },
  ];

  const renderBody = () => {
    if (!hydrated) return <BookingsSkeleton />;
    if (tab === 'history') return <HistoryList bookings={history} now={now} />;
    return <UpcomingList bookings={upcoming} now={now} subscribed={membership.active} />;
  };

  return (
    <Screen
      scroll
      edges={['top']}
      header={<OfflineBanner testID="bookings-offline" />}
      contentStyle={{ gap: spacing[5], paddingBottom: spacing[10] }}
      testID="bookings"
    >
      <View style={[styles.header, { gap: spacing[3] }]}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {t('bookings.title')}
        </Text>
        {membership.active && membership.plan ? (
          <VisitsPill left={membership.visitsLeft} total={membership.plan.visitsPerMonth} />
        ) : null}
      </View>
      <Tabs items={tabs} value={tab} onChange={setTab} testID="bookings-tabs" />
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  title: { flexShrink: 1, marginRight: 'auto' },
});
