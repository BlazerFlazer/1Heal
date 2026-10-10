import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { usePlans } from '@/services/demo/useCatalog';
import { useFormatters } from '@/shared/i18n';
import { palette, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

export type PlanPromoProps = { venueCount: number | undefined };

/** No subscription yet: a calm green promo with the cheapest plan price and a CTA to plans. */
export function PlanPromo({ venueCount }: PlanPromoProps) {
  const { t } = useTranslation();
  const { formatMoney } = useFormatters();
  const { radii, spacing, elevation, isDark } = useTheme();
  const plans = usePlans();
  const minPrice = plans.data?.reduce(
    (min, plan) => Math.min(min, plan.priceUzs),
    Number.POSITIVE_INFINITY,
  );
  const gradient = isDark
    ? ([palette.green[800], palette.green[900]] as const)
    : ([palette.green[600], palette.green[800]] as const);
  const onGreen = { color: palette.white };

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      testID="home-promo"
      style={[
        styles.card,
        { borderRadius: radii.lg, padding: spacing[5], gap: spacing[3] },
        elevation(2),
      ]}
    >
      <View style={[styles.eyebrow, { gap: spacing[2] }]}>
        <Sparkles size={spacing[4]} color={palette.green[200]} />
        <Text variant="overline" style={{ color: palette.green[200] }}>
          {t('home.promo.eyebrow').toUpperCase()}
        </Text>
      </View>
      <Text variant="title" style={onGreen}>
        {venueCount ? t('home.promo.title', { count: venueCount }) : t('home.promo.cta')}
      </Text>
      <Text variant="body" style={{ color: palette.green[100] }}>
        {t('home.promo.body')}
      </Text>
      {minPrice !== undefined && Number.isFinite(minPrice) ? (
        <View style={[styles.price, { gap: spacing[2] }]} testID="home-promo-price">
          <Text variant="subtitle" style={onGreen}>
            {t('home.promo.priceFrom', { price: formatMoney(minPrice) })}
          </Text>
          <Text variant="caption" style={{ color: palette.green[100] }}>
            {t('home.promo.perMonth')}
          </Text>
        </View>
      ) : null}
      <Button
        label={t('home.promo.cta')}
        variant="secondary"
        rightIcon={ArrowRight}
        onPress={() => router.push('/subscription/plans')}
        fullWidth
        testID="home-promo-cta"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  eyebrow: { flexDirection: 'row', alignItems: 'center' },
  price: { flexDirection: 'row', alignItems: 'baseline' },
});
