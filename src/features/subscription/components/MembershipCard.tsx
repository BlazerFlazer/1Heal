import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { SubscriptionState } from '@/domain/membership';
import { text } from '@/services/demo/catalog';
import type { Plan } from '@/services/demo/types';
import { useFormatters } from '@/shared/i18n';
import { palette, useReduceMotion, useTheme } from '@/shared/theme';
import { Badge } from '@/shared/ui/Badge';
import { Text } from '@/shared/ui/Text';

import { isUnlimited } from '../planHelpers';

export type MembershipCardProps = {
  plan: Plan;
  subscription: SubscriptionState;
  visitsUsed: number;
  visitsLeft: number;
};

const ON_CARD = { color: palette.white } as const;
const BAR_HEIGHT = 10;

/** Deep-green "membership pass" with status, period end and an animated visits bar. */
export function MembershipCard({
  plan,
  subscription,
  visitsUsed,
  visitsLeft,
}: MembershipCardProps) {
  const { t } = useTranslation();
  const { spacing, radii, elevation } = useTheme();
  const { locale, formatDate } = useFormatters();
  const reduceMotion = useReduceMotion();
  const unlimited = isUnlimited(plan);
  const until = formatDate(new Date(subscription.periodEnd), 'long');
  const ratio = unlimited ? 1 : Math.min(1, visitsUsed / Math.max(1, plan.visitsPerMonth));
  const progress = useSharedValue(reduceMotion ? ratio : 0);

  useEffect(() => {
    progress.set(reduceMotion ? ratio : withTiming(ratio, { duration: 700 }));
  }, [progress, ratio, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const cancelled = subscription.status === 'cancelled';

  return (
    <LinearGradient
      colors={[palette.green[800], palette.green[600]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        { borderRadius: radii.lg, padding: spacing[6], gap: spacing[4] },
        elevation(3),
      ]}
      testID="manage-card"
    >
      <View style={[styles.orb, { borderRadius: radii.full }]} aria-hidden />
      <View style={[styles.row, { gap: spacing[3] }]}>
        <View style={{ gap: spacing[1] }}>
          <Text variant="overline" style={[ON_CARD, styles.dim]}>
            {t('subscription.manage.planLabel').toUpperCase()}
          </Text>
          <Text variant="display" style={ON_CARD} accessibilityRole="header">
            {text(plan.name, locale)}
          </Text>
        </View>
        <Badge
          tone={cancelled ? 'warning' : 'success'}
          label={
            cancelled
              ? t('subscription.manage.statusCancelled', { date: until })
              : t('subscription.manage.statusActive')
          }
          style={styles.badge}
          testID="manage-status"
        />
      </View>

      <View style={{ gap: spacing[2] }}>
        <Text variant="title" style={ON_CARD} testID="manage-visits-left">
          {unlimited
            ? t('subscription.unlimited')
            : t('subscription.manage.visitsLeft', { count: visitsLeft })}
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={t('subscription.manage.progressLabel', {
            used: visitsUsed,
            total: plan.visitsPerMonth,
          })}
          accessibilityValue={{ min: 0, max: plan.visitsPerMonth, now: visitsUsed }}
          style={[styles.track, { borderRadius: radii.full }]}
        >
          <View style={[StyleSheet.absoluteFill, styles.trackFill]} />
          <Animated.View style={[styles.fill, { borderRadius: radii.full }, fillStyle]} />
        </View>
        <Text variant="caption" style={[ON_CARD, styles.dim]}>
          {unlimited
            ? t('subscription.manage.visitsUsedUnlimited', { used: visitsUsed })
            : t('subscription.manage.visitsUsed', { used: visitsUsed, total: plan.visitsPerMonth })}
        </Text>
      </View>

      <View style={[styles.until, { gap: spacing[2] }]}>
        <CalendarDays size={16} color={palette.white} />
        <Text variant="label" style={ON_CARD}>
          {t('subscription.manage.until', { date: until })}
        </Text>
      </View>
    </LinearGradient>
  );
}

const ORB = 220;

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  orb: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    right: -ORB / 3,
    bottom: -ORB / 2,
    backgroundColor: palette.white,
    opacity: 0.08,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { flexShrink: 1 },
  dim: { opacity: 0.85 },
  track: { height: BAR_HEIGHT, overflow: 'hidden' },
  trackFill: { backgroundColor: palette.white, opacity: 0.25 },
  fill: { height: BAR_HEIGHT, backgroundColor: palette.white },
  until: { flexDirection: 'row', alignItems: 'center' },
});
