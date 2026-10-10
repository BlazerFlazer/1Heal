import { CalendarX } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { nextDays, text } from '@/services/demo/catalog';
import type { ClassSession } from '@/services/demo/types';
import { useSessions } from '@/services/demo/useCatalog';
import { useFormatters, weekdayName } from '@/shared/i18n';
import { MIN_TOUCH, useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PressableScale } from '@/shared/ui/Pressable';
import { SkeletonList } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';

import { SessionRow } from './SessionRow';

export type TimetableProps = {
  venueId: string;
  now: Date;
  isBooked: (sessionId: string) => boolean;
  onBook: (session: ClassSession, title: string) => void;
};

/** Seven-day picker and the selected day's classes with live spots and booking actions. */
export function Timetable({ venueId, now, isBooked, onBook }: TimetableProps) {
  const { t } = useTranslation();
  const f = useFormatters();
  const { colors, spacing, radii } = useTheme();
  const [days] = useState(() => nextDays(7, now));
  const [selected, setSelected] = useState(0);
  const day = days[selected] ?? now;
  const sessions = useSessions(venueId, day);

  return (
    <View style={{ gap: spacing[4] }} testID="venue-timetable">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[2] }}
        accessibilityRole="tablist"
      >
        {days.map((date, i) => {
          const active = i === selected;
          return (
            <PressableScale
              key={date.getTime()}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t('venue.schedule.dayA11y', {
                weekday: weekdayName(date, f.locale, 'long'),
                date: f.formatDate(date),
              })}
              hapticsEnabled
              onPress={() => setSelected(i)}
              style={[
                styles.day,
                { borderRadius: radii.md, paddingVertical: spacing[2], gap: spacing[1] },
                active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              testID={`venue-day-${i}`}
            >
              <Text variant="overline" color={active ? 'onPrimary' : 'textSecondary'}>
                {weekdayName(date, f.locale, 'short').toUpperCase()}
              </Text>
              <Text variant="subtitle" color={active ? 'onPrimary' : 'textPrimary'}>
                {String(date.getDate())}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
      {sessions.isPending ? (
        <SkeletonList count={3} testID="venue-sessions-skeleton" />
      ) : sessions.isError ? (
        <ErrorState onRetry={() => void sessions.refetch()} testID="venue-sessions-error" />
      ) : sessions.data.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title={t('venue.schedule.empty.title')}
          body={t('venue.schedule.empty.body')}
          testID="venue-sessions-empty"
        />
      ) : (
        <View style={{ gap: spacing[2] }}>
          {sessions.data.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              booked={isBooked(session.id)}
              onBook={() => onBook(session, text(session.name, f.locale))}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const DAY_WIDTH = 56;

const styles = StyleSheet.create({
  day: {
    width: DAY_WIDTH,
    minHeight: MIN_TOUCH + 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
