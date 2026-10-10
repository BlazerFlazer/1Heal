import { Image } from 'expo-image';
import { CalendarClock, ShieldCheck, Ticket, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { Venue } from '@/services/demo/types';
import { useMembership } from '@/services/membership/useMembership';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { useVenueMeta } from '@/shared/ui/VenueCard';

import { sameDay } from '../hours';
import type { BookingTarget } from './types';

export type BookingConfirmProps = {
  venue: Venue;
  target: BookingTarget;
  onConfirm: () => void;
};

function InfoRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing[3] }]}>
      <Icon size={20} color={colors.primary} />
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

/** Confirmation step: what, when, where, the visit it uses and the free-cancellation deadline. */
export function BookingConfirm({ venue, target, onConfirm }: BookingConfirmProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const f = useFormatters();
  const meta = useVenueMeta(venue);
  const membership = useMembership();
  const start = new Date(target.startsAt);
  const when = t('booking.confirm.dateTime', {
    date: f.formatRelativeDay(start),
    time: f.formatTimeRange(start, new Date(target.endsAt)),
  });
  const deadline = new Date(target.startsAt - venue.cancellationWindowMin * 60_000);
  const deadlineText = sameDay(deadline, start)
    ? f.formatTime(deadline)
    : t('booking.confirm.dateTime', {
        date: f.formatDate(deadline),
        time: f.formatTime(deadline),
      });
  const kind = target.kind === 'class' ? target.title : t('booking.confirm.dropIn');

  return (
    <View style={{ gap: spacing[5] }} testID="booking-confirm">
      <View
        style={[
          styles.row,
          { gap: spacing[3], padding: spacing[3], borderRadius: radii.md },
          { backgroundColor: colors.surface },
        ]}
      >
        <Image
          source={venue.photos[0] ? { uri: venue.photos[0] } : undefined}
          contentFit="cover"
          transition={200}
          style={[styles.thumb, { borderRadius: radii.sm, backgroundColor: colors.skeletonBase }]}
          accessibilityIgnoresInvertColors
        />
        <View style={[styles.flex, { gap: spacing[1] }]}>
          <Text variant="overline" color="primary">
            {target.kind === 'class' ? t('booking.confirm.class') : t('booking.confirm.dropIn')}
          </Text>
          <Text variant="bodyStrong" numberOfLines={2}>
            {kind}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {meta.name}
          </Text>
        </View>
      </View>
      <View style={{ gap: spacing[4] }}>
        <InfoRow icon={CalendarClock}>
          <Text variant="label" color="textSecondary">
            {t('booking.confirm.when')}
          </Text>
          <Text variant="bodyStrong">{when}</Text>
          <Text variant="caption" color="textSecondary">
            {text(venue.street, f.locale)}
          </Text>
        </InfoRow>
        {membership.active && membership.plan ? (
          <InfoRow icon={Ticket}>
            <Text variant="body">
              {t('booking.confirm.visits', {
                left: Math.max(0, membership.visitsLeft - 1),
                total: membership.plan.visitsPerMonth,
              })}
            </Text>
          </InfoRow>
        ) : null}
        <InfoRow icon={ShieldCheck}>
          <Text variant="body">{t('booking.confirm.cancelUntil', { time: deadlineText })}</Text>
          <Text variant="caption" color="textSecondary">
            {t('booking.confirm.cancelNote')}
          </Text>
        </InfoRow>
      </View>
      <Button
        label={t('booking.confirm.submit')}
        onPress={onConfirm}
        size="lg"
        fullWidth
        haptic="none"
        testID="booking-confirm-submit"
      />
    </View>
  );
}

const THUMB = 64;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  thumb: { width: THUMB, height: THUMB },
});
