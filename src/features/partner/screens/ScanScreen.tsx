import { ScanLine, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useNetworkStatus } from '@/services/network/useNetworkStatus';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

/** Dashed frame where the camera preview (M5) will render. */
export const SCAN_FRAME_BORDER_WIDTH = 2;

/** Partner scanner. The camera permission flow and the scanner itself ship with check-in (M5). */
export function ScanScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { isOnline } = useNetworkStatus();
  const frameSize = spacing[16] * 4;

  return (
    <Screen
      edges={['top']}
      header={<OfflineBanner testID="scan-offline" />}
      contentStyle={[styles.center, { gap: spacing[6] }]}
      testID="scan"
    >
      <Text variant="title" accessibilityRole="header" align="center">
        {t('partner.scan.title')}
      </Text>
      <View
        accessible
        accessibilityLabel={t('partner.scan.frameLabel')}
        testID="scan-frame"
        style={[
          styles.frame,
          {
            width: frameSize,
            height: frameSize,
            borderRadius: radii.lg,
            borderColor: colors.border,
            borderWidth: SCAN_FRAME_BORDER_WIDTH,
          },
        ]}
      >
        <ScanLine size={spacing[16]} color={colors.textDisabled} />
      </View>
      <View style={[styles.actions, { gap: spacing[3] }]}>
        <Button
          label={t('partner.scan.start')}
          leftIcon={ScanLine}
          size="lg"
          fullWidth
          disabled
          testID="scan-start"
        />
        <Text variant="caption" color="textSecondary" align="center">
          {t('partner.scan.helper')}
        </Text>
        {isOnline === false ? (
          <View
            accessibilityLiveRegion="polite"
            testID="scan-offline-note"
            style={[styles.note, { gap: spacing[2] }]}
          >
            <WifiOff size={spacing[4]} color={colors.onWarningBg} />
            <Text variant="caption" color="onWarningBg" style={styles.noteText}>
              {t('partner.scan.offlineNote')}
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  frame: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  actions: { alignSelf: 'stretch' },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  noteText: { flexShrink: 1 },
});
