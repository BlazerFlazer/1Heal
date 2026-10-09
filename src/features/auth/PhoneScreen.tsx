import { zodResolver } from '@hookform/resolvers/zod';
import { Phone } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useNetworkStatus } from '@/services/network/useNetworkStatus';
import { Logo } from '@/shared/brand';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

import { ConsentLine } from './ConsentLine';
import { describeAuthError, isInlineAuthError, type AuthErrorMessage } from './errors';
import { goToVerify, openLegalDoc } from './navigation';
import { nextPhoneValue } from './phoneField';
import { phoneFormSchema, type PhoneFormInput, type PhoneFormOutput } from './schemas';
import { AUTH_TEST_IDS } from './testIds';
import { useRequestOtp } from './useRequestOtp';

/** Phone number entry: masked input, consent links and the "get code" request. */
export function PhoneScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const toast = useToast();
  const { isOnline } = useNetworkStatus();
  const offline = isOnline === false;
  const requestOtp = useRequestOtp();
  const [serverError, setServerError] = useState<AuthErrorMessage | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormInput, unknown, PhoneFormOutput>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  });

  const submit = handleSubmit(({ phone }) => {
    setServerError(null);
    requestOtp.mutate(phone, {
      onSuccess: (result) => goToVerify(phone, result.resendAfterSec),
      onError: (error) => {
        const message = describeAuthError(error);
        if (isInlineAuthError(error)) {
          setServerError(message);
          return;
        }
        toast.show({ tone: 'error', message: t(message.key, message.params) });
      },
    });
  });

  const fieldError = errors.phone?.message;
  const errorText = serverError
    ? t(serverError.key, serverError.params)
    : fieldError === undefined
      ? undefined
      : t(fieldError);

  return (
    <Screen
      scroll
      testID={AUTH_TEST_IDS.phoneScreen}
      header={<OfflineBanner testID={AUTH_TEST_IDS.phoneOffline} />}
    >
      <View style={[styles.body, { gap: spacing[6], paddingTop: spacing[6] }]}>
        <Logo variant="lockup" size={spacing[10]} />
        <View style={{ gap: spacing[2] }}>
          <Text variant="title" accessibilityRole="header">
            {t('auth.phone.title')}
          </Text>
          <Text color="textSecondary">{t('auth.phone.subtitle')}</Text>
        </View>
        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange, onBlur, ref } }) => (
            <Input
              ref={ref}
              testID={AUTH_TEST_IDS.phoneInput}
              label={t('auth.phone.label')}
              placeholder={t('auth.phone.placeholder')}
              value={value}
              onChangeText={(text) => {
                setServerError(null);
                onChange(nextPhoneValue(text));
              }}
              onBlur={onBlur}
              onSubmitEditing={() => void submit()}
              errorText={errorText}
              helperText={offline ? t('auth.phone.offlineHint') : undefined}
              leftIcon={Phone}
              disabled={requestOtp.isPending}
              keyboardType="phone-pad"
              inputMode="tel"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
              returnKeyType="done"
            />
          )}
        />
      </View>
      <View style={{ gap: spacing[4], paddingTop: spacing[6] }}>
        <ConsentLine
          testID={AUTH_TEST_IDS.phoneConsent}
          onOpenTerms={() => openLegalDoc('terms')}
          onOpenPrivacy={() => openLegalDoc('privacy')}
        />
        <Button
          testID={AUTH_TEST_IDS.phoneSubmit}
          label={t('auth.phone.submit')}
          onPress={() => void submit()}
          loading={requestOtp.isPending}
          disabled={offline}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
