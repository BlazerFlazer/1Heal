import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';

export type CancelSheetProps = {
  visible: boolean;
  /** Formatted period end: access stays until then. */
  until: string;
  onConfirm: () => void;
  onClose: () => void;
};

/** "Are you sure?" sheet before switching auto-renewal off for good. */
export function CancelSheet({ visible, until, onConfirm, onClose }: CancelSheetProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('subscription.manage.cancelSheet.title')}
      testID="cancel-sheet"
    >
      <View style={{ gap: spacing[5], paddingBottom: spacing[2] }}>
        <Text color="textSecondary">
          {t('subscription.manage.cancelSheet.body', { date: until })}
        </Text>
        <View style={{ gap: spacing[3] }}>
          <Button
            label={t('subscription.manage.cancelSheet.keep')}
            size="lg"
            fullWidth
            onPress={onClose}
            testID="cancel-sheet-keep"
          />
          <Button
            label={t('subscription.manage.cancelSheet.confirm')}
            variant="destructive"
            size="lg"
            fullWidth
            haptic="none"
            onPress={onConfirm}
            testID="cancel-sheet-confirm"
          />
        </View>
      </View>
    </Sheet>
  );
}
