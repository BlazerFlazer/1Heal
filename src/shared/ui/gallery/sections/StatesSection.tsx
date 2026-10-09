import { Inbox } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState, type ErrorStateVariant } from '@/shared/ui/ErrorState';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { useToast } from '@/shared/ui/Toast';

const VARIANTS: readonly ErrorStateVariant[] = [
  'generic',
  'offline',
  'permissionDenied',
  'notFound',
];

/** EmptyState (bare and full) and every ErrorState variant with a retry. */
export function StatesSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const retry = () => {
    toast.show({ message: t('ui.errorState.retry'), tone: 'info' });
  };

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.empty')} direction="column">
        <Card>
          <EmptyState />
        </Card>
        <Card>
          <EmptyState
            icon={Inbox}
            body={t('ui.gallery.samples.emptyBody')}
            primaryAction={{ label: t('common.actions.search'), onPress: retry }}
            secondaryAction={{ label: t('common.actions.skip'), onPress: retry }}
          />
        </Card>
      </GalleryBlock>
      {VARIANTS.map((variant) => (
        <GalleryBlock key={variant} label={t(`ui.gallery.labels.${variant}`)} direction="column">
          <Card>
            <ErrorState variant={variant} onRetry={retry} testID={`gallery-error-${variant}`} />
          </Card>
        </GalleryBlock>
      ))}
    </>
  );
}
