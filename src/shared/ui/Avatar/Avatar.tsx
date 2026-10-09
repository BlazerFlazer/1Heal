import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import type { TypographyVariant } from '@/shared/theme/tokens';
import { Text } from '@/shared/ui/Text';

import { initialsFor } from './initials';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  /** Remote or local image. Falls back to initials, then to a person icon. */
  uri?: string | null;
  /** Display name used for initials (supports Cyrillic). */
  name?: string;
  /** Optional blurhash shown while the image loads. */
  blurhash?: string;
  size?: AvatarSize;
  /** Spoken description, e.g. t('ui.avatar.initialsLabel', { name }). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TEXT_VARIANTS: Record<AvatarSize, TypographyVariant> = {
  sm: 'label',
  md: 'bodyStrong',
  lg: 'subtitle',
  xl: 'title',
};

/** 32 / 40 / 48 / 64pt circle: image via expo-image over a tinted placeholder, else initials. */
export function Avatar({
  uri,
  name,
  blurhash,
  size = 'md',
  accessibilityLabel,
  style,
  testID,
}: AvatarProps) {
  const { colors, spacing, radii, motion } = useTheme();
  const side = { sm: spacing[8], md: spacing[10], lg: spacing[12], xl: spacing[16] }[size];
  const initials = initialsFor(name);
  const hasImage = typeof uri === 'string' && uri.length > 0;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: side,
          height: side,
          borderRadius: radii.full,
          backgroundColor: colors.primarySubtle,
        },
        style,
      ]}
    >
      {hasImage ? (
        <Image
          testID={testID ? `${testID}-image` : undefined}
          source={{ uri }}
          placeholder={blurhash ? { blurhash } : undefined}
          placeholderContentFit="cover"
          contentFit="cover"
          transition={motion.durations.base}
          recyclingKey={uri}
          style={StyleSheet.absoluteFill}
          aria-hidden
        />
      ) : initials ? (
        <Text variant={TEXT_VARIANTS[size]} color="onPrimarySubtle">
          {initials}
        </Text>
      ) : (
        <User size={side / 2} color={colors.onPrimarySubtle} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
