import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button } from '@/shared/ui/Button';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { noop } from '@/shared/ui/gallery/noop';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';
import { useToast, type ToastTone } from '@/shared/ui/Toast';

const TONES: readonly ToastTone[] = ['success', 'error', 'info', 'neutral'];

/** Sheet (open/close), toasts in every tone (plus an action) and the OfflineBanner. */
export function OverlaysSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const message = t('ui.gallery.samples.toastMessage');
  const actionLabel = t('ui.gallery.samples.toastAction');

  return (
    <>
      <GalleryBlock label={t('ui.gallery.samples.sheetTitle')} direction="column">
        <Button
          label={t('ui.gallery.samples.openSheet')}
          variant="secondary"
          onPress={() => setOpen(true)}
        />
        <Sheet
          visible={open}
          onClose={() => setOpen(false)}
          title={t('ui.gallery.samples.sheetTitle')}
          testID="gallery-sheet"
        >
          <Text color="textSecondary">{t('ui.gallery.samples.sheetBody')}</Text>
          <Button
            label={t('common.actions.done')}
            fullWidth
            onPress={() => setOpen(false)}
            style={{ marginTop: spacing[4] }}
          />
        </Sheet>
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.tones')}>
        {TONES.map((tone) => (
          <Button
            key={tone}
            label={tone}
            variant="outline"
            size="sm"
            onPress={() =>
              toast.show({
                message: tone === 'error' ? t('ui.gallery.samples.toastError') : message,
                tone,
              })
            }
          />
        ))}
        <Button
          label={actionLabel}
          size="sm"
          onPress={() => toast.show({ message, action: { label: actionLabel, onPress: noop } })}
        />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.offline')} direction="column">
        <OfflineBanner testID="gallery-offline" />
        <Text variant="caption" color="textSecondary">
          {t('ui.gallery.samples.offlineNote')}
        </Text>
      </GalleryBlock>
    </>
  );
}
