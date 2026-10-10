import type { LucideIcon } from 'lucide-react-native';
import { CalendarDays, Dumbbell, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getTrainer, text } from '@/services/demo/catalog';
import { useFormatters, useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { Text } from '@/shared/ui/Text';

import { capitalize, type BookingView } from '../bookingView';

type RowProps = { icon: LucideIcon; label: string; value: string; detail?: string };

function InfoRow({ icon: Icon, label, value, detail }: RowProps) {
  const { colors, spacing, radii } = useTheme();
  const circle = spacing[10];
  return (
    <View
      style={[styles.row, { gap: spacing[3] }]}
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
    >
      <View
        style={[
          styles.icon,
          { width: circle, height: circle, borderRadius: radii.full },
          { backgroundColor: colors.primarySubtle },
        ]}
      >
        <Icon size={spacing[5]} color={colors.onPrimarySubtle} />
      </View>
      <View style={styles.body}>
        <Text variant="overline" color="textSecondary">
          {label}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
        {detail ? (
          <Text variant="caption" color="textSecondary">
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** When, what and where of a booking. */
export function BookingInfoCard({ view }: { view: BookingView }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const fmt = useFormatters();
  const { spacing } = useTheme();
  const start = new Date(view.booking.startsAt);
  const minutes = Math.round((view.endsAt - view.booking.startsAt) / 60_000);
  const trainer = getTrainer(view.classTemplate?.trainerId ?? null);
  const time = `${fmt.formatTimeRange(start, new Date(view.endsAt))} · ${fmt.formatDuration(minutes)}`;

  return (
    <Card radius="lg" padding={4} style={{ gap: spacing[4] }} testID="booking-info">
      <InfoRow
        icon={CalendarDays}
        label={t('bookings.detail.when')}
        value={capitalize(fmt.formatDate(start, 'weekday'))}
        detail={time}
      />
      <Divider />
      <InfoRow
        icon={Dumbbell}
        label={t('bookings.detail.format')}
        value={view.classTemplate ? text(view.classTemplate.name, locale) : t('bookings.dropIn')}
        detail={trainer?.name}
      />
      {view.venue ? (
        <>
          <Divider />
          <InfoRow
            icon={MapPin}
            label={t('bookings.detail.where')}
            value={text(view.venue.address, locale)}
            detail={view.venue.district}
          />
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
});
