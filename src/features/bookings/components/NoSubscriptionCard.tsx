import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

function openPlans(): void {
  router.push('/subscription/plans');
}

/** Promo shown instead of the upcoming list while the member has no active subscription. */
export function NoSubscriptionCard() {
  const { t } = useTranslation();
  const { colors, spacing, radii, elevation } = useTheme();
  const badge = spacing[10] + spacing[2];

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryPressed]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      testID="bookings-no-subscription"
      style={[elevation(2), { borderRadius: radii.lg, padding: spacing[5], gap: spacing[3] }]}
    >
      <View
        style={[
          styles.icon,
          { width: badge, height: badge, borderRadius: radii.full },
          { backgroundColor: colors.primarySubtle },
        ]}
      >
        <Sparkles size={spacing[6]} color={colors.onPrimarySubtle} />
      </View>
      <Text variant="overline" color="onPrimary">
        {t('bookings.noSubscription.eyebrow')}
      </Text>
      <Text variant="subtitle" color="onPrimary" accessibilityRole="header">
        {t('bookings.noSubscription.title')}
      </Text>
      <Text variant="body" color="onPrimary">
        {t('bookings.noSubscription.body')}
      </Text>
      <Button
        label={t('bookings.noSubscription.cta')}
        variant="secondary"
        onPress={openPlans}
        style={{ marginTop: spacing[2] }}
        testID="bookings-no-subscription-cta"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});
