import { router } from 'expo-router';
import { Check, Home, Search } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

/** Spinner while the (simulated) provider confirms the payment. */
export function CheckoutProcessing({ providerName }: { providerName: string }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  return (
    <Card
      radius="lg"
      elevation={2}
      padding={8}
      style={[styles.center, { gap: spacing[4] }]}
      testID="checkout-processing"
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <View accessibilityLiveRegion="polite" style={{ gap: spacing[1] }}>
        <Text variant="subtitle" align="center">
          {t('subscription.checkout.processing', { provider: providerName })}
        </Text>
        <Text color="textSecondary" align="center">
          {t('subscription.checkout.processingHint')}
        </Text>
      </View>
    </Card>
  );
}

const CHECK_SIZE = 96;

export type CheckoutSuccessProps = {
  changed: boolean;
  activeUntil: string;
  /** Already formatted amount; omitted for a free plan change. */
  paid?: string;
  providerName: string;
};

/** Animated confirmation with the new period end and the next steps. */
export function CheckoutSuccess({
  changed,
  activeUntil,
  paid,
  providerName,
}: CheckoutSuccessProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.4);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    scale.set(withSpring(1, { damping: 12, stiffness: 180 }));
    opacity.set(withTiming(1, { duration: 250 }));
  }, [reduceMotion, scale, opacity]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View style={[styles.success, { gap: spacing[6] }]} testID="checkout-success">
      <Animated.View
        style={[
          styles.center,
          {
            width: CHECK_SIZE + spacing[8],
            height: CHECK_SIZE + spacing[8],
            borderRadius: radii.full,
            backgroundColor: colors.primarySubtle,
          },
          badgeStyle,
        ]}
      >
        <View
          style={[
            styles.center,
            {
              width: CHECK_SIZE,
              height: CHECK_SIZE,
              borderRadius: radii.full,
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Check size={48} color={colors.onPrimary} strokeWidth={3} />
        </View>
      </Animated.View>
      <Animated.View style={[{ gap: spacing[2] }, copyStyle]} accessibilityLiveRegion="polite">
        <Text variant="title" align="center" accessibilityRole="header">
          {changed ? t('subscription.success.changedTitle') : t('subscription.success.title')}
        </Text>
        <Text variant="bodyStrong" align="center" color="primary">
          {t('subscription.success.activeUntil', { date: activeUntil })}
        </Text>
        {paid ? (
          <Text color="textSecondary" align="center">
            {t('subscription.success.paid', { amount: paid, provider: providerName })}
          </Text>
        ) : null}
      </Animated.View>
      <View style={[styles.actions, { gap: spacing[3] }]}>
        <Button
          label={t('subscription.success.findVenue')}
          leftIcon={Search}
          size="lg"
          fullWidth
          haptic="success"
          onPress={() => router.replace('/discover')}
          testID="checkout-find-venue"
        />
        <Button
          label={t('subscription.success.home')}
          leftIcon={Home}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.replace('/')}
          testID="checkout-home"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch' },
});
