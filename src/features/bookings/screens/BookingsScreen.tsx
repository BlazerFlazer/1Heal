import { router } from 'expo-router';
import { CalendarDays, History } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';

export type BookingsTab = 'upcoming' | 'past';

function openDiscover(): void {
  router.push('/(member)/(tabs)/discover');
}

/** Upcoming / past bookings. Both lists are empty until the booking milestone (M4). */
export function BookingsScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [tab, setTab] = useState<BookingsTab>('upcoming');

  const tabs: readonly TabItem<BookingsTab>[] = [
    { key: 'upcoming', label: t('bookings.tabs.upcoming') },
    { key: 'past', label: t('bookings.tabs.past') },
  ];

  return (
    <Screen
      edges={['top']}
      header={<OfflineBanner testID="bookings-offline" />}
      contentStyle={{ gap: spacing[4] }}
      testID="bookings"
    >
      <Text variant="title" accessibilityRole="header">
        {t('bookings.title')}
      </Text>
      <Tabs items={tabs} value={tab} onChange={setTab} testID="bookings-tabs" />
      {tab === 'upcoming' ? (
        <EmptyState
          icon={CalendarDays}
          title={t('bookings.empty.upcoming.title')}
          body={t('bookings.empty.upcoming.body')}
          primaryAction={{ label: t('bookings.empty.upcoming.cta'), onPress: openDiscover }}
          testID="bookings-empty-upcoming"
        />
      ) : (
        <EmptyState
          icon={History}
          title={t('bookings.empty.past.title')}
          body={t('bookings.empty.past.body')}
          testID="bookings-empty-past"
        />
      )}
    </Screen>
  );
}
