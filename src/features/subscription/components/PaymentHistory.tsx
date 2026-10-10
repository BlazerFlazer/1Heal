import { ArrowUpCircle, Receipt } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getPlan, text } from '@/services/demo/catalog';
import type { PaymentRecord } from '@/services/membership/membershipStore';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Divider } from '@/shared/ui/Divider';
import { Text } from '@/shared/ui/Text';

/** Receipts for every subscription purchase and upgrade surcharge, newest first. */
export function PaymentHistory({ payments }: { payments: PaymentRecord[] }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing[3] }} testID="manage-history">
      <Text variant="subtitle" accessibilityRole="header">
        {t('subscription.manage.history')}
      </Text>
      {payments.length === 0 ? (
        <Text color="textSecondary">{t('subscription.manage.historyEmpty')}</Text>
      ) : (
        <Card radius="lg" padding={0}>
          {payments.map((payment, index) => (
            <View key={payment.id}>
              {index > 0 ? <Divider inset={4} /> : null}
              <ReceiptRow payment={payment} />
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

function ReceiptRow({ payment }: { payment: PaymentRecord }) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { locale, formatMoney, formatDate } = useFormatters();
  const plan = getPlan(payment.planCode);
  const planName = plan ? text(plan.name, locale) : payment.planCode;
  const upgrade = payment.kind === 'upgrade';
  const Icon = upgrade ? ArrowUpCircle : Receipt;
  const title = upgrade
    ? t('subscription.manage.kindUpgrade', { plan: planName })
    : t('subscription.manage.kindSubscription', { plan: planName });
  const meta = t('subscription.manage.receiptMeta', {
    date: formatDate(new Date(payment.paidAt), 'shortYear'),
    provider: t(`subscription.providers.${payment.provider}`),
  });
  const amount = formatMoney(payment.amountUzs);

  return (
    <View
      accessible
      accessibilityLabel={`${title}, ${meta}, ${amount}`}
      style={[styles.row, { padding: spacing[4], gap: spacing[3] }]}
      testID={`receipt-${payment.id}`}
    >
      <View
        style={[styles.icon, { backgroundColor: colors.primarySubtle, borderRadius: radii.sm }]}
      >
        <Icon size={20} color={colors.onPrimarySubtle} />
      </View>
      <View style={styles.copy}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {meta}
        </Text>
      </View>
      <Text variant="bodyStrong">{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
});
