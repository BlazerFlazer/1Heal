import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { Skeleton, SkeletonList } from '@/shared/ui/Skeleton';

/** Skeleton.Box / Text / Circle and the SkeletonList helper. */
export function SkeletonSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.box')} direction="column">
        <Skeleton.Box height={spacing[16]} radius="lg" />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.text')} direction="column">
        <Skeleton.Text />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.circle')}>
        <Skeleton.Circle />
        <Skeleton.Circle size={spacing[16]} />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.list')} direction="column">
        <SkeletonList />
      </GalleryBlock>
    </>
  );
}
