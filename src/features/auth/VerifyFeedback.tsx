import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useFormatters } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

import type { AuthErrorMessage } from './errors';
import { AUTH_TEST_IDS } from './testIds';

/** `until` is null when the provider did not say how long the lock lasts. */
export type VerifyLock = { until: Date | null };

export type VerifyFeedbackProps = {
  verifying: boolean;
  lock: VerifyLock | null;
  error: AuthErrorMessage | null;
};

/** The one line under the code cells: checking, locked, or the last actionable error. */
export function VerifyFeedback({ verifying, lock, error }: VerifyFeedbackProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { formatTime } = useFormatters();

  if (verifying) {
    return (
      <View
        accessibilityLiveRegion="polite"
        testID={AUTH_TEST_IDS.otpVerifying}
        style={[styles.row, { gap: spacing[2] }]}
      >
        <ActivityIndicator color={colors.primary} />
        <Text color="textSecondary">{t('auth.verify.verifying')}</Text>
      </View>
    );
  }

  if (lock !== null) {
    return (
      <View
        accessibilityLiveRegion="polite"
        testID={AUTH_TEST_IDS.otpLocked}
        style={{ gap: spacing[1] }}
      >
        <Text variant="bodyStrong" color="error" align="center">
          {lock.until === null
            ? t('errors.auth.locked')
            : t('auth.verify.lockedUntil', { time: formatTime(lock.until) })}
        </Text>
        <Text variant="caption" color="textSecondary" align="center">
          {t('auth.verify.lockedBody')}
        </Text>
      </View>
    );
  }

  if (error !== null) {
    return (
      <Text
        variant="caption"
        color="error"
        align="center"
        accessibilityLiveRegion="polite"
        testID={AUTH_TEST_IDS.otpError}
      >
        {t(error.key, error.params)}
      </Text>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
