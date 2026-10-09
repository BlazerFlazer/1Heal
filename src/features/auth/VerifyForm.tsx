import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MOCK_OTP_CODE } from '@/services/auth';
import { useAuthStore } from '@/services/auth/authStore';
import { formatPhone } from '@/shared/i18n';
import { haptics, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { OTPInput } from '@/shared/ui/OTPInput';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import { DevCodeHint } from './DevCodeHint';
import {
  authErrorCode,
  describeAuthError,
  isInlineAuthError,
  retryAfterSec,
  type AuthErrorMessage,
} from './errors';
import { goToSignIn } from './navigation';
import { AUTH_TEST_IDS } from './testIds';
import { formatCountdown, useCountdown } from './useCountdown';
import { useRequestOtp } from './useRequestOtp';
import { useVerifyOtp } from './useVerifyOtp';
import { VerifyFeedback, type VerifyLock } from './VerifyFeedback';

export type VerifyFormProps = {
  /** E.164 number the code was sent to. */
  phone: string;
  /** Seconds before "resend" becomes available. */
  resendAfterSec: number;
};

const MS_PER_SECOND = 1000;

/** Code entry with auto-submit, resend countdown, lockout handling and the dev-code shortcut. */
export function VerifyForm({ phone, resendAfterSec: initialResendAfterSec }: VerifyFormProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const toast = useToast();
  const setSession = useAuthStore((state) => state.setSession);
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const resend = useCountdown(initialResendAfterSec);
  const lockTimer = useCountdown();
  const [code, setCode] = useState('');
  const [shake, setShake] = useState(false);
  const [inlineError, setInlineError] = useState<AuthErrorMessage | null>(null);
  const [lock, setLock] = useState<VerifyLock | null>(null);

  /** A timed lock ends with its countdown; an open-ended one ends with the next resend. */
  const activeLock = lock !== null && (lock.until === null || lockTimer.running) ? lock : null;
  const locked = activeLock !== null;
  const busy = verifyOtp.isPending || requestOtp.isPending;

  const showToastError = (error: unknown) => {
    const message = describeAuthError(error);
    toast.show({ tone: 'error', message: t(message.key, message.params) });
  };

  const onVerifyError = (error: unknown) => {
    const message = describeAuthError(error);
    switch (authErrorCode(error)) {
      case 'INVALID_CODE':
        setCode('');
        setShake(true);
        setInlineError(message);
        return;
      case 'CODE_EXPIRED':
        setCode('');
        setInlineError(message);
        resend.stop();
        return;
      case 'LOCKED': {
        const seconds = retryAfterSec(error);
        setCode('');
        setInlineError(null);
        setLock({
          until: seconds === undefined ? null : new Date(Date.now() + seconds * MS_PER_SECOND),
        });
        if (seconds !== undefined) {
          lockTimer.start(seconds);
        }
        return;
      }
      case 'TOO_MANY_REQUESTS':
        setInlineError(message);
        return;
      default:
        showToastError(error);
    }
  };

  const submit = (value: string) => {
    if (busy || locked) {
      return;
    }
    verifyOtp.mutate(
      { phoneE164: phone, code: value },
      {
        onSuccess: (session) => {
          void haptics.success();
          setSession(session);
        },
        onError: onVerifyError,
      },
    );
  };

  const onCodeChange = (value: string) => {
    setCode(value);
    setShake(false);
    setInlineError(null);
  };

  const onResend = () => {
    requestOtp.mutate(phone, {
      onSuccess: (result) => {
        setLock(null);
        setInlineError(null);
        setShake(false);
        setCode('');
        resend.start(result.resendAfterSec);
        toast.show({ tone: 'success', message: t('auth.verify.resent') });
      },
      onError: (error) => {
        if (!isInlineAuthError(error)) {
          showToastError(error);
          return;
        }
        setInlineError(describeAuthError(error));
        const seconds = retryAfterSec(error);
        if (seconds !== undefined) {
          resend.start(seconds);
        }
      },
    });
  };

  return (
    <Screen
      scroll
      testID={AUTH_TEST_IDS.verifyScreen}
      header={
        <View style={{ paddingHorizontal: spacing[2] }}>
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('common.actions.back')}
            onPress={goToSignIn}
            testID={AUTH_TEST_IDS.verifyBack}
          />
        </View>
      }
    >
      <View style={[styles.body, { gap: spacing[6] }]}>
        <View style={{ gap: spacing[2] }}>
          <Text variant="title" accessibilityRole="header">
            {t('auth.verify.title')}
          </Text>
          <Text color="textSecondary">
            {t('auth.verify.subtitle', { phone: formatPhone(phone) })}
          </Text>
        </View>
        <OTPInput
          value={code}
          onChange={onCodeChange}
          onComplete={submit}
          autoFocus
          error={shake}
          disabled={locked || verifyOtp.isPending}
          accessibilityLabel={t('auth.verify.codeLabel')}
          testID={AUTH_TEST_IDS.otpInput}
        />
        <VerifyFeedback verifying={verifyOtp.isPending} lock={activeLock} error={inlineError} />
        <DevCodeHint onPress={() => submit(MOCK_OTP_CODE)} disabled={busy || locked} />
      </View>
      <View style={{ gap: spacing[2], paddingTop: spacing[6] }}>
        <Button
          testID={AUTH_TEST_IDS.otpResend}
          label={
            resend.running
              ? t('auth.verify.resendIn', { time: formatCountdown(resend.seconds) })
              : t('auth.verify.resend')
          }
          onPress={onResend}
          variant="secondary"
          disabled={resend.running || verifyOtp.isPending}
          loading={requestOtp.isPending}
          fullWidth
        />
        <Button
          testID={AUTH_TEST_IDS.otpChangeNumber}
          label={t('auth.verify.changeNumber')}
          onPress={goToSignIn}
          variant="ghost"
          haptic="none"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
