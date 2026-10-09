import { useTranslation } from 'react-i18next';

import { typography, type ThemeColors, type TypographyVariant } from '@/shared/theme/tokens';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { Text } from '@/shared/ui/Text';

const VARIANTS = Object.keys(typography) as TypographyVariant[];
const COLORS: readonly (keyof ThemeColors)[] = [
  'textPrimary',
  'textSecondary',
  'textDisabled',
  'primary',
  'success',
  'warning',
  'error',
  'info',
];

/** Every typography variant and the text color roles. */
export function TextSection() {
  const { t } = useTranslation();
  const sample = t('ui.gallery.samples.body');
  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.variants')} direction="column">
        {VARIANTS.map((variant) => {
          const line = `${variant} · ${sample}`;
          return (
            <Text key={variant} variant={variant}>
              {line}
            </Text>
          );
        })}
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.tones')} direction="column">
        {COLORS.map((color) => (
          <Text key={color} color={color}>
            {color}
          </Text>
        ))}
      </GalleryBlock>
    </>
  );
}
