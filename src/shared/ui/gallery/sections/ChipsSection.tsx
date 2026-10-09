import { Dumbbell } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Chip } from '@/shared/ui/Chip';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { noop } from '@/shared/ui/gallery/noop';

const TONES: readonly BadgeTone[] = ['success', 'warning', 'error', 'info', 'neutral', 'primary'];

/** Chip (selected, icon, sizes, disabled) and Badge (tones, sizes, counts, dot). */
export function ChipsSection() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(true);
  const label = t('ui.gallery.samples.chipLabel');
  const badgeLabel = t('ui.badge.new');

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.default')}>
        <Chip label={label} selected={selected} onPress={() => setSelected((value) => !value)} />
        <Chip label={label} leftIcon={Dumbbell} onPress={noop} />
        <Chip label={label} size="sm" onPress={noop} />
        <Chip label={label} size="sm" selected leftIcon={Dumbbell} onPress={noop} />
        <Chip label={label} disabled onPress={noop} />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.tones')}>
        {TONES.map((tone) => (
          <Badge key={tone} tone={tone} label={tone} />
        ))}
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.sizes')}>
        <Badge size="sm" tone="primary" label={badgeLabel} />
        <Badge size="md" tone="primary" label={badgeLabel} />
        <Badge tone="error" count={7} />
        <Badge tone="error" count={120} />
        <Badge tone="success" dot accessibilityLabel={t('ui.gallery.labels.selected')} />
      </GalleryBlock>
    </>
  );
}
