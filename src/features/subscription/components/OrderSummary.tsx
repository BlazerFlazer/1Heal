import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { Plan } from '@/services/demo/types';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { Text } from '@/shared/ui/Text';

import { isUnlimited } from '../planHelpers';

export type OrderSummaryProps = {
  plan: Plan;
  /** Set when switching plans: the plan the member has today. */
  fromPlan: Plan | null;
  amountUzs: number;
};

/** Receipt-style summary of what is being bought and what it costs today. */
export function OrderSummary({ plan, fromPlan, amountUzs }: OrderSummaryProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale, formatMoney } = useFormatters();
  const quota = isUnlimited(plan)
    ? t('subscription.unlimited')
    : t('subscription.visits', { count: plan.visitsPerMonth });

  return (
    <Card
      radius="lg"
      elevation={2}
      padding={5}
      style={{ gap: spacing[3] }}
      testID="checkout-summary"
    >
      <Text variant="overline" color="textSecondary">
        {t('subscription.checkout.summary').toUpperCase()}
      </Text>
      {fromPlan ? (
        <Row label={t('subscription.checkout.changeFrom')} value={text(fromPlan.name, locale)} />
      ) : null}
      <Row label={t('subscription.checkout.plan')} value={text(plan.name, locale)} strong />
      <Row label={t('subscription.checkout.visits')} value={quota} />
      {fromPlan ? null : (
        <Row
          label={t('subscription.checkout.period')}
          value={t('subscription.checkout.periodValue')}
        />
      )}
      <Divider />
      <View style={styles.row}>
        <Text variant="bodyStrong">
          {fromPlan ? t('subscription.checkout.prorated') : t('subscription.checkout.total')}
        </Text>
        <Text variant="title" testID="checkout-total">
          {amountUzs > 0 ? formatMoney(amountUzs) : t('subscription.checkout.freeChange')}
        </Text>
      </View>
    </Card>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing[4] }]}>
      <Text color="textSecondary">{label}</Text>
      <Text variant={strong ? 'bodyStrong' : 'body'} style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flexShrink: 1, textAlign: 'right' },
});
