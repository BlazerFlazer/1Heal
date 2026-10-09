import { router } from 'expo-router';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { EmptyState } from '@/shared/ui/EmptyState';
import { IconButton } from '@/shared/ui/IconButton';
import { Screen } from '@/shared/ui/Screen';

/** Reachable by deep link too, so "back" needs a fallback when there is no history. */
function leavePlans(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

/** Placeholder until the subscription milestone ships plan comparison and checkout. */
export default function SubscriptionPlansRoute() {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <Screen
      testID="plans"
      contentStyle={styles.center}
      header={
        <View style={{ paddingHorizontal: spacing[2] }}>
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('common.actions.back')}
            onPress={leavePlans}
            testID="plans-back"
          />
        </View>
      }
    >
      <EmptyState
        icon={Sparkles}
        title={t('home.subscription.plansSoon.title')}
        body={t('home.subscription.plansSoon.body')}
        testID="plans-empty"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
});
