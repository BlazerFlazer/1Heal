import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';

export type SignOutSheetProps = {
  visible: boolean;
  /** Disables cancel and shows a spinner on confirm while the sign-out request runs. */
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Also applied as `${testID}-confirm` and `${testID}-cancel`. */
  testID?: string;
};

/** Confirmation before ending the session; signing back in needs a fresh SMS code. */
export function SignOutSheet({ visible, busy, onClose, onConfirm, testID }: SignOutSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const sub = (suffix: string) => (testID === undefined ? undefined : `${testID}-${suffix}`);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('profile.signOut.title')} testID={testID}>
      <View style={{ gap: spacing[3] }}>
        <Text color="textSecondary">{t('profile.signOut.body')}</Text>
        <Button
          label={t('profile.signOut.confirm')}
          variant="destructive"
          loading={busy}
          fullWidth
          onPress={onConfirm}
          testID={sub('confirm')}
        />
        <Button
          label={t('profile.signOut.cancel')}
          variant="ghost"
          disabled={busy}
          fullWidth
          onPress={onClose}
          testID={sub('cancel')}
        />
      </View>
    </Sheet>
  );
}
