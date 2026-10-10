import { CreditCard, ShieldCheck, Smartphone, Wallet, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { PaymentProvider } from '@/services/membership/membershipStore';
import { useTheme } from '@/shared/theme';
import { Badge } from '@/shared/ui/Badge';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

import { PROVIDERS } from '../planHelpers';

/** Neutral icons on purpose: no provider logos until the brand agreements are signed. */
const ICONS: Record<PaymentProvider, LucideIcon> = {
  payme: CreditCard,
  click: Wallet,
  uzum: Smartphone,
};

export type ProviderPickerProps = {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  disabled?: boolean;
};

/** Radio group of the three Uzbek payment providers plus the "card data never reaches us" note. */
export function ProviderPicker({ value, onChange, disabled = false }: ProviderPickerProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={[styles.titleRow, { gap: spacing[2] }]}>
        <Text variant="subtitle" accessibilityRole="header">
          {t('subscription.checkout.provider')}
        </Text>
        <Badge tone="info" size="sm" label={t('subscription.checkout.sandbox')} />
      </View>
      <View accessibilityRole="radiogroup" style={{ gap: spacing[2] }}>
        {PROVIDERS.map((provider) => {
          const selected = provider === value;
          const Icon = ICONS[provider];
          const name = t(`subscription.providers.${provider}`);
          return (
            <PressableScale
              key={provider}
              accessibilityRole="radio"
              accessibilityLabel={name}
              accessibilityHint={t(`subscription.checkout.providerHint.${provider}`)}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              hapticsEnabled
              onPress={() => onChange(provider)}
              style={[
                styles.option,
                {
                  gap: spacing[3],
                  padding: spacing[4],
                  borderRadius: radii.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySubtle : colors.surfaceElevated,
                },
              ]}
              testID={`provider-${provider}`}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: colors.surfaceElevated, borderRadius: radii.sm },
                ]}
              >
                <Icon size={22} color={colors.primary} />
              </View>
              <View style={styles.copy}>
                <Text variant="bodyStrong">{name}</Text>
                <Text variant="caption" color="textSecondary">
                  {t(`subscription.checkout.providerHint.${provider}`)}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? colors.primary : colors.borderStrong },
                ]}
              >
                {selected ? (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
      <View style={[styles.secure, { gap: spacing[2] }]}>
        <ShieldCheck size={18} color={colors.success} />
        <Text variant="caption" color="textSecondary" style={styles.copy}>
          {t('subscription.checkout.secure')}
        </Text>
      </View>
    </View>
  );
}

const RADIO = 22;

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 64 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: RADIO / 2, height: RADIO / 2, borderRadius: RADIO / 4 },
  secure: { flexDirection: 'row', alignItems: 'flex-start' },
});
