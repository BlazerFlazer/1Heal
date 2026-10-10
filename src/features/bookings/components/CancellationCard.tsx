import { AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { cancellationOutcome, type BookingRecord } from '@/domain/membership';
import { useMembership } from '@/services/membership/useMembership';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import { daysFromNow } from '../bookingView';

type Props = { booking: BookingRecord; windowMin: number; now: number };

/** Free-until preview, the cancel button and its confirmation sheet. */
export function CancellationCard({ booking, windowMin, now }: Props) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const { colors, spacing, radii } = useTheme();
  const toast = useToast();
  const { cancelBooking } = useMembership();
  const [confirming, setConfirming] = useState(false);

  const free = cancellationOutcome(booking, windowMin, now) === 'cancelled';
  const deadline = new Date(booking.startsAt - windowMin * 60_000);
  const deadlineText =
    daysFromNow(deadline, now) === 0
      ? fmt.formatTime(deadline)
      : t('bookings.dateTime', { date: fmt.formatDate(deadline), time: fmt.formatTime(deadline) });
  const Icon = free ? ShieldCheck : AlertTriangle;
  const circle = spacing[10];

  const confirm = () => {
    const outcome = cancellationOutcome(booking, windowMin, Date.now());
    cancelBooking(booking.id, windowMin);
    setConfirming(false);
    toast.show(
      outcome === 'cancelled'
        ? { message: t('bookings.detail.cancel.doneFree'), tone: 'success' }
        : { message: t('bookings.detail.cancel.doneLate'), tone: 'info' },
    );
  };

  return (
    <Card radius="lg" padding={4} style={{ gap: spacing[4] }} testID="booking-cancellation">
      <View style={[styles.row, { gap: spacing[3] }]}>
        <View
          style={[
            styles.icon,
            { width: circle, height: circle, borderRadius: radii.full },
            { backgroundColor: free ? colors.successBg : colors.warningBg },
          ]}
        >
          <Icon size={spacing[5]} color={free ? colors.onSuccessBg : colors.onWarningBg} />
        </View>
        <View style={[styles.body, { gap: spacing[1] }]}>
          <Text variant="bodyStrong" testID="booking-cancel-preview">
            {free
              ? t('bookings.detail.cancel.freeUntil', { time: deadlineText })
              : t('bookings.detail.cancel.late')}
          </Text>
          <Text variant="caption" color="textSecondary">
            {free
              ? t('bookings.detail.cancel.freeBody')
              : t('bookings.detail.cancel.lateBody', { window: fmt.formatDuration(windowMin) })}
          </Text>
        </View>
      </View>
      <Button
        label={t('bookings.detail.cancel.action')}
        variant="outline"
        onPress={() => setConfirming(true)}
        testID="booking-cancel"
      />
      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        title={t('bookings.detail.cancel.confirmTitle')}
        testID="booking-cancel-sheet"
      >
        <View style={{ gap: spacing[3] }}>
          <Text variant="body" color="textSecondary">
            {free
              ? t('bookings.detail.cancel.confirmFree')
              : t('bookings.detail.cancel.confirmLate')}
          </Text>
          <Button
            label={t('bookings.detail.cancel.confirm')}
            variant="destructive"
            haptic="none"
            onPress={confirm}
            testID="booking-cancel-confirm"
          />
          <Button
            label={t('bookings.detail.cancel.keep')}
            variant="ghost"
            onPress={() => setConfirming(false)}
            testID="booking-cancel-keep"
          />
        </View>
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
});
