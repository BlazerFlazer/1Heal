import { Heart, MapPin, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { Button, type ButtonSize, type ButtonVariant } from '@/shared/ui/Button';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { IconButton, type IconButtonVariant } from '@/shared/ui/IconButton';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';
import { useToast } from '@/shared/ui/Toast';

const VARIANTS: readonly ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'destructive',
];
const SIZES: readonly ButtonSize[] = ['sm', 'md', 'lg'];
const ICON_VARIANTS: readonly IconButtonVariant[] = ['ghost', 'filled', 'primary', 'outline'];

/** Button, IconButton and the raw PressableScale in every variant and state. */
export function ButtonsSection() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const toast = useToast();
  const label = t('ui.gallery.samples.action');
  const press = () => {
    toast.show({ message: t('ui.gallery.samples.toastMessage'), tone: 'success' });
  };

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.variants')}>
        {VARIANTS.map((variant) => (
          <Button key={variant} label={variant} variant={variant} onPress={press} />
        ))}
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.sizes')}>
        {SIZES.map((size) => (
          <Button key={size} label={label} size={size} onPress={press} />
        ))}
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.withIcon')}>
        <Button label={label} leftIcon={MapPin} onPress={press} />
        <Button label={label} rightIcon={Plus} variant="secondary" onPress={press} />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.loading')}>
        <Button label={label} loading />
        <Button label={label} variant="outline" loading />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.disabled')}>
        <Button label={label} disabled />
        <Button label={label} variant="secondary" disabled />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.fullWidth')} direction="column">
        <Button label={label} fullWidth onPress={press} />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.iconButtons')}>
        {ICON_VARIANTS.map((variant) => (
          <IconButton
            key={variant}
            icon={Heart}
            variant={variant}
            accessibilityLabel={variant}
            onPress={press}
          />
        ))}
        <IconButton
          icon={Heart}
          size="lg"
          iconColor="error"
          accessibilityLabel={label}
          onPress={press}
        />
        <IconButton icon={Heart} accessibilityLabel={label} disabled />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.pressable')}>
        <PressableScale
          accessibilityLabel={label}
          hapticsEnabled
          onPress={press}
          style={{
            padding: spacing[4],
            borderRadius: radii.md,
            backgroundColor: colors.primarySubtle,
          }}
        >
          <Text color="onPrimarySubtle">{label}</Text>
        </PressableScale>
      </GalleryBlock>
    </>
  );
}
