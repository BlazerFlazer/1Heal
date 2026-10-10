import { router } from 'expo-router';
import { CreditCard, Repeat, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { useMembership } from '@/services/membership/useMembership';
import { useFormatters } from '@/shared/i18n';
import { palette, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ListItem } from '@/shared/ui/ListItem';
import { Screen } from '@/shared/ui/Screen';

import { CancelSheet } from '../components/CancelSheet';
import { MembershipCard } from '../components/MembershipCard';
import { PaymentHistory } from '../components/PaymentHistory';
import { ScreenHeader } from '../components/ScreenHeader';

const openPlans = () => router.push('/subscription/plans');

/** Subscription management: pass card, visits, auto-renewal, plan change, cancel, receipts. */
export function ManageScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { formatDate, formatMoney } = useFormatters();
  const membership = useMembership();
  const [confirming, setConfirming] = useState(false);
  const { subscription, plan, active } = membership;
  const header = <ScreenHeader title={t('subscription.manage.title')} testID="manage" />;

  if (!active || subscription === null || plan === null) {
    const expired = subscription !== null;
    return (
      <Screen header={header} testID="manage" contentStyle={{ justifyContent: 'center' }}>
        <EmptyState
          icon={CreditCard}
          title={t(expired ? 'subscription.manage.expiredTitle' : 'subscription.manage.emptyTitle')}
          body={t(expired ? 'subscription.manage.expiredBody' : 'subscription.manage.emptyBody')}
          primaryAction={{ label: t('subscription.manage.choosePlan'), onPress: openPlans }}
          testID="manage-empty"
        />
      </Screen>
    );
  }

  const until = formatDate(new Date(subscription.periodEnd), 'long');
  const cancelled = subscription.status === 'cancelled';
  const confirmCancel = () => {
    membership.cancelSubscription();
    setConfirming(false);
  };

  return (
    <Screen
      scroll
      header={header}
      contentStyle={{ gap: spacing[6], paddingBottom: spacing[10] }}
      testID="manage"
    >
      <MembershipCard
        plan={plan}
        subscription={subscription}
        visitsUsed={membership.visitsUsed}
        visitsLeft={membership.visitsLeft}
      />

      <Card radius="lg" padding={0}>
        <ListItem
          title={t('subscription.manage.autoRenew')}
          subtitle={
            subscription.autoRenew
              ? t('subscription.manage.autoRenewOn', {
                  date: until,
                  amount: formatMoney(plan.priceUzs),
                })
              : t('subscription.manage.autoRenewOff', { date: until })
          }
          trailing={
            <Switch
              value={subscription.autoRenew}
              onValueChange={membership.setAutoRenew}
              accessibilityLabel={t('subscription.manage.autoRenew')}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={palette.white}
              testID="manage-auto-renew"
            />
          }
        />
      </Card>

      <View style={{ gap: spacing[3] }}>
        <Button
          label={t('subscription.manage.changePlan')}
          leftIcon={Repeat}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={openPlans}
          testID="manage-change-plan"
        />
        {cancelled ? (
          <Button
            label={t('subscription.manage.resume')}
            leftIcon={RotateCcw}
            size="lg"
            fullWidth
            onPress={() => membership.setAutoRenew(true)}
            testID="manage-resume"
          />
        ) : (
          <Button
            label={t('subscription.manage.cancel')}
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setConfirming(true)}
            testID="manage-cancel"
          />
        )}
      </View>

      <PaymentHistory payments={membership.payments} />

      <CancelSheet
        visible={confirming}
        until={until}
        onConfirm={confirmCancel}
        onClose={() => setConfirming(false)}
      />
    </Screen>
  );
}
