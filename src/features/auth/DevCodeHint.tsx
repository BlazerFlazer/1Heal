import { Bug } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MOCK_OTP_CODE } from '@/services/auth';
import { Chip } from '@/shared/ui/Chip';

import { shouldShowDevCodeHint } from './devHint';
import { AUTH_TEST_IDS } from './testIds';

export type DevCodeHintProps = {
  /** Submits the mock code. */
  onPress: () => void;
  disabled?: boolean;
};

/** Dev-only shortcut: a clearly labelled chip that fills in the mock provider's code. */
export function DevCodeHint({ onPress, disabled = false }: DevCodeHintProps) {
  const { t } = useTranslation();

  if (!shouldShowDevCodeHint()) {
    return null;
  }

  return (
    <View style={styles.center}>
      <Chip
        size="sm"
        leftIcon={Bug}
        label={t('auth.verify.devHint', { code: MOCK_OTP_CODE })}
        accessibilityLabel={t('auth.verify.devHintLabel', { code: MOCK_OTP_CODE })}
        onPress={onPress}
        disabled={disabled}
        testID={AUTH_TEST_IDS.otpDevHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
});
