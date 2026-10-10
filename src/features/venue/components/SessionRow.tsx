import { CircleCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getTrainer, text } from '@/services/demo/catalog';
import type { ClassSession } from '@/services/demo/types';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

export type SessionRowProps = {
  session: ClassSession;
  booked: boolean;
  onBook: () => void;
};

/** One class occurrence: time and length, class, coach, spots left and the book action. */
export function SessionRow({ session, booked, onBook }: SessionRowProps) {
  const { t } = useTranslation();
  const f = useFormatters();
  const { colors, spacing, radii } = useTheme();
  const start = new Date(session.startsAt);
  const name = text(session.name, f.locale);
  const trainer = getTrainer(session.trainerId);
  const spots = Math.max(0, session.capacity - session.takenByOthers - (booked ? 1 : 0));
  const full = spots === 0 && !booked;
  const time = f.formatTime(start);

  return (
    <View
      style={[
        styles.row,
        { gap: spacing[3], padding: spacing[3], borderRadius: radii.md },
        { backgroundColor: booked ? colors.successBg : colors.surface, borderColor: colors.border },
      ]}
      testID={`venue-session-${session.id}`}
    >
      <View style={[styles.time, { gap: spacing[1] }]}>
        <Text variant="subtitle">{time}</Text>
        <Text variant="caption" color="textSecondary">
          {f.formatDuration((session.endsAt - session.startsAt) / 60_000)}
        </Text>
      </View>
      <View style={[styles.body, { gap: spacing[1] }]}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {name}
        </Text>
        {trainer ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {t('venue.schedule.trainer', { name: trainer.name })}
          </Text>
        ) : null}
        {booked ? null : (
          <Text variant="caption" color={spots <= 3 ? 'onWarningBg' : 'primary'}>
            {full ? t('venue.schedule.full') : t('venue.schedule.spots', { count: spots })}
          </Text>
        )}
      </View>
      {booked ? (
        <View style={[styles.booked, { gap: spacing[1] }]}>
          <CircleCheck size={18} color={colors.success} />
          <Text variant="label" color="onSuccessBg">
            {t('venue.schedule.booked')}
          </Text>
        </View>
      ) : (
        <Button
          label={t('venue.schedule.book')}
          accessibilityLabel={t('venue.schedule.bookA11y', { name, time })}
          onPress={onBook}
          size="sm"
          variant={full ? 'secondary' : 'primary'}
          disabled={full}
          testID={`venue-session-book-${session.id}`}
        />
      )}
    </View>
  );
}

const TIME_COLUMN = 64;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  time: { width: TIME_COLUMN },
  body: { flex: 1 },
  booked: { flexDirection: 'row', alignItems: 'center' },
});
