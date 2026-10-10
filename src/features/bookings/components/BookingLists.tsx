import { router } from 'expo-router';
import { CalendarSearch, History } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { BookingRecord } from '@/domain/membership';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Text } from '@/shared/ui/Text';

import { capitalize, daysFromNow, groupByDay } from '../bookingView';
import { BookingCard } from './BookingCard';
import { NoSubscriptionCard } from './NoSubscriptionCard';

function openDiscover(): void {
  router.push('/discover');
}

type UpcomingProps = { bookings: BookingRecord[]; now: number; subscribed: boolean };

/** Upcoming bookings grouped under "Today", "Tomorrow" or a weekday header. */
export function UpcomingList({ bookings, now, subscribed }: UpcomingProps) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const { spacing } = useTheme();

  if (bookings.length === 0) {
    return subscribed ? (
      <EmptyState
        icon={CalendarSearch}
        title={t('bookings.empty.upcoming.title')}
        body={t('bookings.empty.upcoming.body')}
        primaryAction={{ label: t('bookings.empty.upcoming.cta'), onPress: openDiscover }}
        testID="bookings-empty-upcoming"
      />
    ) : (
      <NoSubscriptionCard />
    );
  }

  return (
    <View style={{ gap: spacing[6] }} testID="bookings-upcoming">
      {groupByDay(bookings).map((group) => {
        const days = daysFromNow(group.date, now);
        const label =
          days <= 1
            ? fmt.formatRelativeDay(group.date, new Date(now))
            : capitalize(fmt.formatDate(group.date, 'weekday'));
        return (
          <View key={group.key} style={{ gap: spacing[3] }}>
            <Text variant="subtitle" accessibilityRole="header">
              {label}
            </Text>
            {group.items.map((booking, index) => (
              <BookingCard key={booking.id} booking={booking} now={now} index={index} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

type HistoryProps = { bookings: BookingRecord[]; now: number };

/** Visited, cancelled and late-cancelled bookings, newest first. */
export function HistoryList({ bookings, now }: HistoryProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={t('bookings.empty.history.title')}
        body={t('bookings.empty.history.body')}
        testID="bookings-empty-history"
      />
    );
  }

  return (
    <View style={{ gap: spacing[3] }} testID="bookings-history">
      {bookings.map((booking, index) => (
        <BookingCard key={booking.id} booking={booking} now={now} index={index} showDate />
      ))}
    </View>
  );
}
