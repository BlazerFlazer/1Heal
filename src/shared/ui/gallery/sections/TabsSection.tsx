import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';

type BookingTab = 'upcoming' | 'past' | 'waitlist';

const MANY_TABS = 7;

/** Segmented tabs with badges and the scrollable variant. */
export function TabsSection() {
  const { t } = useTranslation();
  const [value, setValue] = useState<BookingTab>('upcoming');
  const [manyValue, setManyValue] = useState('tab0');

  const items: TabItem<BookingTab>[] = [
    { key: 'upcoming', label: t('ui.gallery.samples.tabs.upcoming'), badge: 2 },
    { key: 'past', label: t('ui.gallery.samples.tabs.past') },
    { key: 'waitlist', label: t('ui.gallery.samples.tabs.waitlist'), badge: t('ui.badge.new') },
  ];
  const manyItems: TabItem[] = Array.from({ length: MANY_TABS }, (_, index) => ({
    key: `tab${index}`,
    label: `${t('ui.gallery.samples.label')} ${index + 1}`,
  }));

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.withBadges')} direction="column">
        <Tabs testID="gallery-booking-tabs" items={items} value={value} onChange={setValue} />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.scrollable')} direction="column">
        <Tabs items={manyItems} value={manyValue} onChange={setManyValue} />
      </GalleryBlock>
    </>
  );
}
