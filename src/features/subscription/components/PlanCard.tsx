import { Check, Ticket } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { Plan } from '@/services/demo/types';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PriceTag } from '@/shared/ui/PriceTag';
import { Text } from '@/shared/ui/Text';

import { isUnlimited, type PlanAction } from '../planHelpers';

export type PlanCardProps = {
  plan: Plan;
  action: PlanAction;
  popular?: boolean;
  onPress: () => void;
};

/** One tariff: name, monthly price, quota, localized perks and the call to action. */
export function PlanCard({ plan, action, popular = false, onPress }: PlanCardProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { locale, formatMoney } = useFormatters();
  const name = text(plan.name, locale);
  const highlighted = action.kind === 'current' || (popular && action.kind === 'subscribe');
  const quota = isUnlimited(plan)
    ? t('subscription.unlimited')
    : t('subscription.visits', { count: plan.visitsPerMonth });

  return (
    <Card
      radius="lg"
      elevation={highlighted ? 3 : 1}
      padding={5}
      style={[
        { gap: spacing[4], borderWidth: highlighted ? 2 : 1 },
        highlighted ? { borderColor: colors.primary } : null,
      ]}
      testID={`plan-${plan.code}`}
    >
      <View style={styles.headerRow}>
        <Text variant="title" accessibilityRole="header">
          {name}
        </Text>
        {action.kind === 'current' ? (
          <Badge tone="success" label={t('subscription.plans.current')} />
        ) : popular ? (
          <Badge tone="primary" label={t('subscription.plans.popular')} />
        ) : null}
      </View>

      <PriceTag amountUzs={plan.priceUzs} period={t('subscription.plans.perMonth')} size="md" />

      <View
        style={[
          styles.quota,
          {
            backgroundColor: colors.primarySubtle,
            borderRadius: radii.full,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1],
            gap: spacing[2],
          },
        ]}
      >
        <Ticket size={16} color={colors.onPrimarySubtle} />
        <Text variant="label" color="onPrimarySubtle">
          {quota}
        </Text>
      </View>

      <View style={{ gap: spacing[2] }}>
        {plan.perks
          .filter((perk) => perk.key !== 'visits')
          .map((perk) => (
            <View key={perk.key} style={[styles.perk, { gap: spacing[3] }]}>
              <View
                style={[
                  styles.check,
                  { backgroundColor: colors.successBg, borderRadius: radii.full },
                ]}
              >
                <Check size={14} color={colors.success} strokeWidth={3} />
              </View>
              <Text style={styles.perkText}>{text(perk, locale)}</Text>
            </View>
          ))}
      </View>

      <View style={{ gap: spacing[2] }}>
        <PlanButton name={name} action={action} highlighted={highlighted} onPress={onPress} />
        {action.kind === 'upgrade' ? (
          <Text variant="caption" color="textSecondary" align="center">
            {t('subscription.plans.upgradeCharge', { amount: formatMoney(action.charge) })}
          </Text>
        ) : null}
        {action.kind === 'downgrade' ? (
          <Text variant="caption" color="textSecondary" align="center">
            {t('subscription.plans.downgradeFree')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

type PlanButtonProps = {
  name: string;
  action: PlanAction;
  highlighted: boolean;
  onPress: () => void;
};

function PlanButton({ name, action, highlighted, onPress }: PlanButtonProps) {
  const { t } = useTranslation();
  if (action.kind === 'current') {
    return (
      <Button
        label={t('subscription.plans.manage')}
        variant="secondary"
        fullWidth
        onPress={onPress}
      />
    );
  }
  const subscribe = action.kind === 'subscribe';
  return (
    <Button
      label={t(subscribe ? 'subscription.plans.subscribe' : 'subscription.plans.switch')}
      accessibilityLabel={t(
        subscribe ? 'subscription.plans.subscribeLabel' : 'subscription.plans.switchLabel',
        { plan: name },
      )}
      variant={highlighted || action.kind === 'upgrade' ? 'primary' : 'outline'}
      size="lg"
      fullWidth
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quota: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  perk: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  perkText: { flex: 1 },
});
