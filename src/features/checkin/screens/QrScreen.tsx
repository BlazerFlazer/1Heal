import { router } from 'expo-router';
import { QrCode, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useNetworkStatus } from '@/services/network/useNetworkStatus';
import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

/** Dashed frame where the rotating QR code (M5) will render. */
export const QR_FRAME_BORDER_WIDTH = 2;

function openPlans(): void {
  router.push('/(member)/subscription/plans');
}

/** Member QR hub. Without a subscription it explains how check-in works and points at plans. */
export function QrScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { isOnline } = useNetworkStatus();
  const frameSize = spacing[16] * 3;

  return (
    <Screen
      edges={['top']}
      header={<OfflineBanner testID="qr-offline" />}
      contentStyle={[styles.center, { gap: spacing[6] }]}
      testID="qr"
    >
      <Text variant="title" accessibilityRole="header" align="center">
        {t('qr.title')}
      </Text>
      <Card radius="lg" padding={6} style={[styles.card, { gap: spacing[4] }]} testID="qr-card">
        <View
          accessible
          accessibilityLabel={t('qr.frameLabel')}
          testID="qr-frame"
          style={[
            styles.frame,
            {
              width: frameSize,
              height: frameSize,
              borderRadius: radii.md,
              borderColor: colors.border,
              borderWidth: QR_FRAME_BORDER_WIDTH,
            },
          ]}
        >
          <QrCode size={spacing[16]} color={colors.textDisabled} />
        </View>
        <EmptyState
          title={t('qr.inactive.title')}
          body={t('qr.inactive.body')}
          primaryAction={{ label: t('qr.inactive.cta'), onPress: openPlans }}
          style={{ padding: spacing[0] }}
          testID="qr-inactive"
        />
      </Card>
      {isOnline === false ? (
        <View
          accessibilityLiveRegion="polite"
          testID="qr-offline-note"
          style={[styles.note, { gap: spacing[2], paddingHorizontal: spacing[4] }]}
        >
          <WifiOff size={spacing[4]} color={colors.textSecondary} />
          <Text variant="caption" color="textSecondary" style={styles.noteText}>
            {t('qr.offlineNote')}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  card: { alignItems: 'center', alignSelf: 'stretch' },
  frame: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  note: { flexDirection: 'row', alignItems: 'center' },
  noteText: { flex: 1 },
});
