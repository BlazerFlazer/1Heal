import { CircleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BookingError } from '@/domain/membership';
import { getPlans, text } from '@/services/demo/catalog';
import { useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

import { errorAction } from './types';

export type BookingErrorViewProps = {
  error: BookingError;
  venueTier: number;
  /** Navigates to the plans screen (choose or upgrade). */
  onPlans: () => void;
  onClose: () => void;
};

const ICON_CIRCLE = 72;

/** Error step: why the booking is refused and, where it helps, the way to fix it. */
export function BookingErrorView({ error, venueTier, onPlans, onClose }: BookingErrorViewProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const action = errorAction(error);
  const minPlan = getPlans().find((plan) => plan.maxVenueTier >= venueTier);
  const message = t(`booking.errors.${error}`, {
    plan: minPlan ? text(minPlan.name, locale) : '',
  });

  return (
    <View style={[styles.center, { gap: spacing[4] }]} testID="booking-error">
      <View style={[styles.icon, { backgroundColor: colors.errorBg, borderRadius: radii.full }]}>
        <CircleAlert size={32} color={colors.error} />
      </View>
      <View style={{ gap: spacing[2] }}>
        <Text variant="subtitle" align="center" accessibilityRole="header">
          {t('booking.errors.title')}
        </Text>
        <Text
          variant="body"
          color="textSecondary"
          align="center"
          accessibilityLiveRegion="polite"
          testID="booking-error-message"
        >
          {message}
        </Text>
      </View>
      <View style={[styles.actions, { gap: spacing[3], marginTop: spacing[2] }]}>
        {action === null ? null : (
          <Button
            label={
              action === 'plans' ? t('booking.errors.choosePlan') : t('booking.errors.upgrade')
            }
            onPress={onPlans}
            size="lg"
            fullWidth
            testID="booking-error-action"
          />
        )}
        <Button
          label={t('booking.errors.back')}
          onPress={onClose}
          variant={action === null ? 'primary' : 'ghost'}
          size="lg"
          fullWidth
          testID="booking-error-close"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  icon: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { alignSelf: 'stretch' },
});
