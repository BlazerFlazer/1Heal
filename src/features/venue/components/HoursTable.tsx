import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { nextDays } from '@/services/demo/catalog';
import type { Venue } from '@/services/demo/types';
import { useLocale, weekdayIndex, weekdayName } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

import { formatSlots, sameDay, slotsOn } from '../hours';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Monday-first weekly opening hours; today's row is highlighted. */
export function HoursTable({ venue, now }: { venue: Venue; now: Date }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const week = nextDays(7, now).sort((a, b) => weekdayIndex(a) - weekdayIndex(b));

  return (
    <View style={{ gap: spacing[1] }} testID="venue-hours">
      {week.map((day) => {
        const isToday = sameDay(day, now);
        const slots = slotsOn(venue, day);
        const womenOnly = slots.some((slot) => slot.womenOnly);
        return (
          <View
            key={day.getDay()}
            style={[
              styles.row,
              {
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                borderRadius: radii.sm,
              },
              isToday ? { backgroundColor: colors.primarySubtle } : null,
            ]}
          >
            <Text
              variant={isToday ? 'bodyStrong' : 'body'}
              color={isToday ? 'onPrimarySubtle' : 'textPrimary'}
            >
              {isToday ? t('venue.hours.today') : capitalize(weekdayName(day, locale, 'long'))}
            </Text>
            <View style={styles.end}>
              <Text
                variant={isToday ? 'bodyStrong' : 'body'}
                color={
                  slots.length === 0 ? 'textSecondary' : isToday ? 'onPrimarySubtle' : 'textPrimary'
                }
              >
                {slots.length > 0 ? formatSlots(slots) : t('venue.hours.closed')}
              </Text>
              {womenOnly ? (
                <Text variant="caption" color="textSecondary">
                  {t('venue.hours.womenOnly')}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  end: { alignItems: 'flex-end' },
});
