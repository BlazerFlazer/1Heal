import { CalendarCheck, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';

export type TodayTab = 'bookings' | 'waitlist';

/** Today's bookings and waitlist for the venue; data arrives with the partner milestone (M7). */
export function TodayScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [tab, setTab] = useState<TodayTab>('bookings');

  const tabs: readonly TabItem<TodayTab>[] = [
    { key: 'bookings', label: t('partner.today.tabs.bookings') },
    { key: 'waitlist', label: t('partner.today.tabs.waitlist') },
  ];

  return (
    <Screen
      edges={['top']}
      header={<OfflineBanner testID="today-offline" />}
      contentStyle={{ gap: spacing[4] }}
      testID="today"
    >
      <Text variant="title" accessibilityRole="header">
        {t('partner.today.title')}
      </Text>
      <Tabs items={tabs} value={tab} onChange={setTab} testID="today-tabs" />
      {tab === 'bookings' ? (
        <EmptyState
          icon={CalendarCheck}
          title={t('partner.today.empty.bookings.title')}
          body={t('partner.today.empty.bookings.body')}
          testID="today-empty-bookings"
        />
      ) : (
        <EmptyState
          icon={Users}
          title={t('partner.today.empty.waitlist.title')}
          body={t('partner.today.empty.waitlist.body')}
          testID="today-empty-waitlist"
        />
      )}
    </Screen>
  );
}
