import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemeProvider, useTheme } from '@/shared/theme/ThemeProvider';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { ToastProvider } from '@/shared/ui/Toast';

import { GalleryHeader } from './GalleryHeader';
import { ButtonsSection } from './sections/ButtonsSection';
import { CardsSection } from './sections/CardsSection';
import { ChipsSection } from './sections/ChipsSection';
import { InputsSection } from './sections/InputsSection';
import { MediaSection } from './sections/MediaSection';
import { OverlaysSection } from './sections/OverlaysSection';
import { SkeletonSection } from './sections/SkeletonSection';
import { StatesSection } from './sections/StatesSection';
import { TabsSection } from './sections/TabsSection';
import { TextSection } from './sections/TextSection';

export type GallerySectionKey =
  | 'text'
  | 'buttons'
  | 'inputs'
  | 'chips'
  | 'media'
  | 'cards'
  | 'tabs'
  | 'states'
  | 'skeleton'
  | 'overlays';

type GallerySection = { key: GallerySectionKey; Component: ComponentType };

/** Order of the gallery; titles come from `ui.gallery.sections.<key>`. */
export const GALLERY_SECTIONS: readonly GallerySection[] = [
  { key: 'text', Component: TextSection },
  { key: 'buttons', Component: ButtonsSection },
  { key: 'inputs', Component: InputsSection },
  { key: 'chips', Component: ChipsSection },
  { key: 'media', Component: MediaSection },
  { key: 'cards', Component: CardsSection },
  { key: 'tabs', Component: TabsSection },
  { key: 'states', Component: StatesSection },
  { key: 'skeleton', Component: SkeletonSection },
  { key: 'overlays', Component: OverlaysSection },
];

function GalleryContent() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <Screen scroll testID="gallery" header={<GalleryHeader />} contentStyle={{ gap: spacing[8] }}>
      {GALLERY_SECTIONS.map(({ key, Component }) => (
        <Section key={key} testID={`gallery-${key}`} title={t(`ui.gallery.sections.${key}`)}>
          <Component />
        </Section>
      ))}
    </Screen>
  );
}

/**
 * Dev-only showcase of every component in every state, with theme and language switches.
 * Brings its own theme and toast providers so the route file stays a one-liner.
 */
export function GalleryScreen() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider>
        <ToastProvider testID="gallery-toasts">
          <GalleryContent />
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
