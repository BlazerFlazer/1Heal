import { Ticket } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

type Props = { left: number; total: number };

/** "6 of 8 left" summary next to the screen title. */
export function VisitsPill({ left, total }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('bookings.visitsPillA11y', { left, total })}
      testID="bookings-visits"
      style={[
        styles.pill,
        {
          gap: spacing[1],
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          borderRadius: radii.full,
          backgroundColor: colors.primarySubtle,
        },
      ]}
    >
      <Ticket size={spacing[4]} color={colors.onPrimarySubtle} />
      <Text variant="label" color="onPrimarySubtle">
        {t('bookings.visitsPill', { left, total })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center' },
});
