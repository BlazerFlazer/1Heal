import { router, useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { upgradeCharge } from '@/domain/membership';
import { getPlan } from '@/services/demo/catalog';
import type { PaymentProvider } from '@/services/membership/membershipStore';
import { useMembership } from '@/services/membership/useMembership';
import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Screen } from '@/shared/ui/Screen';
import { useNow } from '@/shared/utils/useNow';

import { CheckoutProcessing, CheckoutSuccess } from '../components/CheckoutStatus';
import { OrderSummary } from '../components/OrderSummary';
import { ProviderPicker } from '../components/ProviderPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { isPlanCode, PROCESSING_MS } from '../planHelpers';

type Phase = 'review' | 'processing' | 'success';

/** Order summary → provider choice → simulated confirmation → success (demo mode, ADR-032). */
export function CheckoutScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { formatMoney, formatDate } = useFormatters();
  const params = useLocalSearchParams<{ plan?: string; mode?: string }>();
  const membership = useMembership();
  const now = useNow();
  const [phase, setPhase] = useState<Phase>('review');
  const [provider, setProvider] = useState<PaymentProvider>('payme');
  const [paidUzs, setPaidUzs] = useState(0);
  const [changed, setChanged] = useState(false);

  const plan = isPlanCode(params.plan) ? getPlan(params.plan) : undefined;
  const { active, plan: currentPlan, subscription, purchase, changePlan } = membership;
  const isChange =
    phase === 'review'
      ? params.mode === 'change' &&
        active &&
        currentPlan !== null &&
        currentPlan.code !== plan?.code
      : changed;
  const amountUzs =
    plan === undefined
      ? 0
      : isChange && currentPlan && subscription
        ? upgradeCharge(currentPlan, plan, subscription, now)
        : plan.priceUzs;
  const providerName = t(`subscription.providers.${provider}`);

  useEffect(() => {
    if (phase !== 'processing' || plan === undefined) return;
    const id = setTimeout(() => {
      if (changed) {
        setPaidUzs(changePlan(plan.code, provider));
      } else {
        purchase(plan.code, provider);
        setPaidUzs(plan.priceUzs);
      }
      setPhase('success');
    }, PROCESSING_MS);
    return () => clearTimeout(id);
  }, [phase, plan, changed, provider, changePlan, purchase]);

  if (plan === undefined) {
    return (
      <Screen header={<ScreenHeader title={t('subscription.checkout.title')} />} testID="checkout">
        <ErrorState
          variant="notFound"
          title={t('subscription.checkout.notFoundTitle')}
          body={t('subscription.checkout.notFoundBody')}
          primaryAction={{
            label: t('subscription.checkout.toPlans'),
            onPress: () => router.replace('/subscription/plans'),
          }}
          testID="checkout-not-found"
        />
      </Screen>
    );
  }

  if (phase === 'success') {
    const periodEnd = subscription?.periodEnd ?? now;
    return (
      <Screen contentStyle={{ padding: spacing[6] }} testID="checkout">
        <CheckoutSuccess
          changed={changed}
          activeUntil={formatDate(new Date(periodEnd), 'long')}
          paid={paidUzs > 0 ? formatMoney(paidUzs) : undefined}
          providerName={providerName}
        />
      </Screen>
    );
  }

  const processing = phase === 'processing';
  const pay = () => {
    setChanged(isChange);
    setPhase('processing');
  };

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title={t('subscription.checkout.title')}
          backDisabled={processing}
          testID="checkout"
        />
      }
      contentStyle={{ gap: spacing[6], paddingBottom: spacing[10] }}
      testID="checkout"
    >
      <OrderSummary plan={plan} fromPlan={isChange ? currentPlan : null} amountUzs={amountUzs} />
      {processing ? (
        <CheckoutProcessing providerName={providerName} />
      ) : (
        <View style={{ gap: spacing[6] }}>
          <ProviderPicker value={provider} onChange={setProvider} />
          <Button
            label={
              amountUzs > 0
                ? t('subscription.checkout.pay', { amount: formatMoney(amountUzs) })
                : t('subscription.checkout.confirmChange')
            }
            leftIcon={Lock}
            size="lg"
            fullWidth
            onPress={pay}
            testID="checkout-pay"
          />
        </View>
      )}
    </Screen>
  );
}
