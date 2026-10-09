import { router } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Text } from '@/shared/ui/Text';

/** "Your subscription" card. Without a subscription it invites the member to pick a plan. */
export function SubscriptionCard() {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <Card testID="home-subscription" style={{ gap: spacing[2] }}>
      <Text variant="subtitle" accessibilityRole="header">
        {t('home.subscription.title')}
      </Text>
      <EmptyState
        icon={CreditCard}
        title={t('home.subscription.none.title')}
        body={t('home.subscription.none.body')}
        primaryAction={{
          label: t('home.subscription.none.cta'),
          onPress: () => router.push('/(member)/subscription/plans'),
        }}
        style={{ padding: spacing[2] }}
        testID="home-subscription-empty"
      />
    </Card>
  );
}
