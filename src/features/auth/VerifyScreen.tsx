import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ErrorState } from '@/shared/ui/ErrorState';
import { Screen } from '@/shared/ui/Screen';

import { goToSignIn } from './navigation';
import { AUTH_TEST_IDS } from './testIds';
import { VerifyForm } from './VerifyForm';
import { parseVerifyParams } from './verifyParams';

export type VerifyScreenProps = {
  /** Raw route params: `phone` (E.164, required) and `resendAfterSec` (whole seconds, optional). */
  params: Record<string, string | string[] | undefined>;
};

/** Without a request result (deep link) the user may ask for a code straight away. */
const DEFAULT_RESEND_AFTER_SEC = 0;

function InvalidPhone() {
  const { t } = useTranslation();
  return (
    <Screen contentStyle={styles.center}>
      <ErrorState
        title={t('auth.verify.invalidPhoneTitle')}
        body={t('auth.verify.invalidPhone')}
        primaryAction={{ label: t('auth.verify.changeNumber'), onPress: goToSignIn }}
        testID={AUTH_TEST_IDS.verifyInvalid}
      />
    </Screen>
  );
}

/** Validates the route params, then renders the code form or a broken-link placeholder. */
export function VerifyScreen({ params }: VerifyScreenProps) {
  const parsed = parseVerifyParams(params);
  if (parsed === null) {
    return <InvalidPhone />;
  }
  return (
    <VerifyForm
      phone={parsed.phone}
      resendAfterSec={parsed.resendAfterSec ?? DEFAULT_RESEND_AFTER_SEC}
    />
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
});
