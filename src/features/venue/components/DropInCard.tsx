import { DoorOpen } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Venue } from '@/services/demo/types';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Chip } from '@/shared/ui/Chip';
import { Text } from '@/shared/ui/Text';

import { dropInSlots, sameDay } from '../hours';

export type DropInCardProps = {
  venue: Venue;
  now: Date;
  onBook: (startsAt: Date) => void;
};

/** "Drop-in visit": pick one of the next whole hours the venue is open and book it. */
export function DropInCard({ venue, now, onBook }: DropInCardProps) {
  const { t } = useTranslation();
  const f = useFormatters();
  const { colors, spacing, radii } = useTheme();
  const [slots] = useState(() => dropInSlots(venue, now));
  const [picked, setPicked] = useState(0);
  const slot = slots[picked];
  const label = (date: Date) =>
    sameDay(date, now) ? f.formatTime(date) : `${f.formatTime(date)} ${t('venue.dropIn.tomorrow')}`;

  return (
    <Card radius="lg" elevation={2} padding={5} testID="venue-dropin">
      <View style={{ gap: spacing[4] }}>
        <View style={[styles.row, { gap: spacing[3] }]}>
          <View
            style={[styles.icon, { backgroundColor: colors.primarySubtle, borderRadius: radii.md }]}
          >
            <DoorOpen size={22} color={colors.onPrimarySubtle} />
          </View>
          <View style={[styles.flex, { gap: spacing[1] }]}>
            <Text variant="subtitle">{t('venue.dropIn.title')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('venue.dropIn.body')}
            </Text>
          </View>
        </View>
        {slot === undefined ? (
          <Text variant="body" color="textSecondary">
            {t('venue.dropIn.unavailable')}
          </Text>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing[2] }}
            >
              {slots.map((date, i) => (
                <Chip
                  key={date.getTime()}
                  size="sm"
                  label={label(date)}
                  accessibilityLabel={t('venue.dropIn.slotA11y', { time: label(date) })}
                  selected={i === picked}
                  onPress={() => setPicked(i)}
                  testID={`venue-dropin-slot-${i}`}
                />
              ))}
            </ScrollView>
            <Button
              label={t('venue.dropIn.book', { time: label(slot) })}
              onPress={() => onBook(slot)}
              size="lg"
              fullWidth
              testID="venue-dropin-book"
            />
          </>
        )}
      </View>
    </Card>
  );
}

const ICON = 48;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  icon: { width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center' },
});
