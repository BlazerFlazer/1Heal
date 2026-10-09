import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { formatMoney } from '@/shared/i18n/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { useTheme } from '@/shared/theme/ThemeProvider';
import type { TypographyVariant } from '@/shared/theme/tokens';
import { Text } from '@/shared/ui/Text';

export type PriceTagSize = 'sm' | 'md' | 'lg';

export type PriceTagProps = {
  amountUzs: number;
  /** Previous price rendered struck through before the current one. */
  oldAmountUzs?: number;
  /** Period suffix, e.g. t('ui.priceTag.perMonth'). */
  period?: string;
  size?: PriceTagSize;
  /** Overrides the spoken text (defaults to price + period). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const AMOUNT_VARIANTS: Record<PriceTagSize, TypographyVariant> = {
  sm: 'bodyStrong',
  md: 'title',
  lg: 'display',
};

const DETAIL_VARIANTS: Record<PriceTagSize, TypographyVariant> = {
  sm: 'caption',
  md: 'label',
  lg: 'body',
};

/** Integer UZS formatted for the active locale, with optional old price and period suffix. */
export function PriceTag({
  amountUzs,
  oldAmountUzs,
  period,
  size = 'md',
  accessibilityLabel,
  style,
  testID,
}: PriceTagProps) {
  const { locale } = useLocale();
  const { spacing } = useTheme();
  const price = formatMoney(amountUzs, locale);
  const oldPrice = oldAmountUzs === undefined ? undefined : formatMoney(oldAmountUzs, locale);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? [price, period].filter(Boolean).join(' ')}
      style={[styles.row, { gap: spacing[1] }, style]}
    >
      {oldPrice ? (
        <Text variant={DETAIL_VARIANTS[size]} color="textSecondary" style={styles.struck}>
          {oldPrice}
        </Text>
      ) : null}
      <Text variant={AMOUNT_VARIANTS[size]} color="textPrimary">
        {price}
      </Text>
      {period ? (
        <Text variant={DETAIL_VARIANTS[size]} color="textSecondary">
          {period}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  struck: { textDecorationLine: 'line-through' },
});
