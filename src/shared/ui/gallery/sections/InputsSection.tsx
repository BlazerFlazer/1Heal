import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { noop } from '@/shared/ui/gallery/noop';
import { Input } from '@/shared/ui/Input';
import { OTPInput } from '@/shared/ui/OTPInput';

/** Input (default, error, disabled, secure) and OTPInput (default, error, disabled). */
export function InputsSection() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const label = t('ui.gallery.samples.label');
  const otpLabel = t('ui.gallery.labels.otp');

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.default')} direction="column">
        <Input
          label={label}
          placeholder={t('ui.gallery.samples.placeholder')}
          helperText={t('ui.gallery.samples.helper')}
          leftIcon={Search}
          value={text}
          onChangeText={setText}
          clearable
          clearLabel={t('ui.input.clear')}
        />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.error')} direction="column">
        <Input
          label={label}
          defaultValue={t('ui.gallery.samples.title')}
          errorText={t('ui.gallery.samples.errorText')}
        />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.disabled')} direction="column">
        <Input label={label} defaultValue={t('ui.gallery.samples.title')} disabled />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.secure')} direction="column">
        <Input
          label={t('ui.gallery.labels.secure')}
          value={secret}
          onChangeText={setSecret}
          secureTextEntry
          secureToggleLabels={{
            show: t('ui.input.showPassword'),
            hide: t('ui.input.hidePassword'),
          }}
        />
      </GalleryBlock>
      <GalleryBlock label={otpLabel} direction="column">
        <OTPInput value={code} onChange={setCode} accessibilityLabel={otpLabel} />
        <OTPInput value="12" onChange={noop} error accessibilityLabel={otpLabel} />
        <OTPInput value="123456" onChange={noop} disabled accessibilityLabel={otpLabel} />
      </GalleryBlock>
    </>
  );
}
