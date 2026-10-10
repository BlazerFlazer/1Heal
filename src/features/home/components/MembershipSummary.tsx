import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { MembershipView } from '@/services/membership/useMembership';
import { useFormatters, useLocale } from '@/shared/i18n';
import { MIN_TOUCH, useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

import { VisitsRing } from './VisitsRing';

export type MembershipSummaryProps = Pick<MembershipView, 'plan' | 'subscription' | 'visitsLeft'>;

/** Active membership: plan, visits-left ring, validity and a link to manage it. */
export function MembershipSummary({ plan, subscription, visitsLeft }: MembershipSummaryProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatDate } = useFormatters();
  const { colors, spacing } = useTheme();
  if (!plan || !subscription) return null;

  const total = plan.visitsPerMonth;
  const date = formatDate(new Date(subscription.periodEnd), 'long');
  const renews = subscription.status === 'active' && subscription.autoRenew;

  return (
    <Card radius="lg" elevation={2} padding={5} testID="home-membership">
      <View style={[styles.row, { gap: spacing[5] }]}>
        <VisitsRing
          left={visitsLeft}
          total={total}
          caption={t('home.membership.of', { total })}
          accessibilityLabel={t('home.membership.ringA11y', { left: visitsLeft, total })}
          testID="home-visits-ring"
        />
        <View style={[styles.info, { gap: spacing[1] }]}>
          <Text variant="overline" color="textSecondary">
            {t('home.membership.planLabel').toUpperCase()}
          </Text>
          <Text variant="subtitle" numberOfLines={1}>
            {text(plan.name, locale)}
          </Text>
          <Text variant="caption" color={renews ? 'textSecondary' : 'onWarningBg'}>
            {renews ? t('home.membership.until', { date }) : t('home.membership.endsOn', { date })}
          </Text>
          <PressableScale
            accessibilityRole="link"
            accessibilityLabel={t('home.membership.manageA11y')}
            onPress={() => router.push('/subscription')}
            hapticsEnabled
            testID="home-membership-manage"
            style={[styles.manage, { gap: spacing[1] }]}
          >
            <Text variant="label" color="primary">
              {t('home.membership.manage')}
            </Text>
            <ChevronRight size={spacing[4]} color={colors.primary} />
          </PressableScale>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
  manage: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH },
});
