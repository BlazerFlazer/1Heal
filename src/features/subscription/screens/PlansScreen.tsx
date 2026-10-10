import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Plan } from '@/services/demo/types';
import { usePlans } from '@/services/demo/useCatalog';
import { useMembership } from '@/services/membership/useMembership';
import { useReduceMotion, useTheme } from '@/shared/theme';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Screen } from '@/shared/ui/Screen';
import { SkeletonBox } from '@/shared/ui/Skeleton';
import { Text } from '@/shared/ui/Text';
import { useNow } from '@/shared/utils/useNow';

import { PlanCard } from '../components/PlanCard';
import { PlansFaq } from '../components/PlansFaq';
import { PlansHero } from '../components/PlansHero';
import { ScreenHeader } from '../components/ScreenHeader';
import { planAction, POPULAR_PLAN, type PlanAction } from '../planHelpers';

const STAGGER_MS = 70;

function openAction(plan: Plan, action: PlanAction): void {
  if (action.kind === 'current') {
    router.push('/subscription');
    return;
  }
  const params =
    action.kind === 'subscribe' ? { plan: plan.code } : { plan: plan.code, mode: 'change' };
  router.push({ pathname: '/subscription/checkout', params });
}

/** Tariff comparison: hero, three plan cards, FAQ and the auto-renewal note. */
export function PlansScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const reduceMotion = useReduceMotion();
  const plans = usePlans();
  const membership = useMembership();
  const now = useNow();

  return (
    <Screen
      scroll
      header={<ScreenHeader title={t('subscription.plans.title')} testID="plans" />}
      contentStyle={{ gap: spacing[6], paddingBottom: spacing[10] }}
      testID="plans"
    >
      <PlansHero />

      {plans.isPending ? (
        <View style={{ gap: spacing[4] }} testID="plans-loading">
          {[0, 1, 2].map((index) => (
            <SkeletonBox key={index} height={320} radius="lg" aria-hidden={index > 0} />
          ))}
        </View>
      ) : plans.isError ? (
        <ErrorState
          title={t('subscription.plans.errorTitle')}
          onRetry={() => void plans.refetch()}
          testID="plans-error"
        />
      ) : (
        <View style={{ gap: spacing[4] }}>
          {plans.data.map((plan, index) => {
            const action = planAction(plan, membership, now);
            return (
              <Animated.View
                key={plan.id}
                entering={reduceMotion ? undefined : FadeInDown.delay(index * STAGGER_MS)}
              >
                <PlanCard
                  plan={plan}
                  action={action}
                  popular={plan.code === POPULAR_PLAN}
                  onPress={() => openAction(plan, action)}
                />
              </Animated.View>
            );
          })}
        </View>
      )}

      <PlansFaq />

      <Text variant="caption" color="textSecondary" align="center">
        {t('subscription.plans.legal')}
      </Text>
    </Screen>
  );
}
