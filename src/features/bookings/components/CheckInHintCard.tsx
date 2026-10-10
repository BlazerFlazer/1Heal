import { router } from 'expo-router';
import { ChevronRight, QrCode } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { Text } from '@/shared/ui/Text';

function openQr(): void {
  router.push('/qr');
}

/** Reminds the member how check-in works and jumps to the QR tab. */
export function CheckInHintCard() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const tile = spacing[12];

  return (
    <Card
      radius="lg"
      padding={4}
      elevation={0}
      onPress={openQr}
      accessibilityLabel={t('bookings.detail.checkin.title')}
      accessibilityHint={t('bookings.detail.checkin.cta')}
      style={{ backgroundColor: colors.primarySubtle, borderColor: colors.primarySubtle }}
      testID="booking-checkin"
    >
      <View style={[styles.row, { gap: spacing[3] }]}>
        <View
          style={[
            styles.icon,
            { width: tile, height: tile, borderRadius: radii.md },
            { backgroundColor: colors.primary },
          ]}
        >
          <QrCode size={spacing[6]} color={colors.onPrimary} />
        </View>
        <View style={[styles.body, { gap: spacing[1] }]}>
          <Text variant="bodyStrong" color="onPrimarySubtle">
            {t('bookings.detail.checkin.title')}
          </Text>
          <Text variant="caption" color="onPrimarySubtle">
            {t('bookings.detail.checkin.body')}
          </Text>
        </View>
        <ChevronRight size={spacing[5]} color={colors.onPrimarySubtle} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
});
