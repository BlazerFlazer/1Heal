import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import { IconButton } from '@/shared/ui/IconButton';

import type { BookingPhase } from '../bookingView';
import { StatusBadge } from './StatusBadge';

type Props = { photo: string | undefined; phase: BookingPhase; onBack: () => void };

/** Full-bleed venue photo with a soft bottom shade, the back button and the status badge. */
export function BookingHero({ photo, phase, onBack }: Props) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const height = spacing[16] * 4 + insets.top;

  return (
    <View style={{ height, backgroundColor: colors.skeletonBase }} testID="booking-hero">
      <Image
        source={photo ? { uri: photo } : null}
        contentFit="cover"
        transition={200}
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', colors.overlay]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.back, { top: insets.top + spacing[2], left: spacing[3] }]}>
        <IconButton
          icon={ArrowLeft}
          variant="filled"
          accessibilityLabel={t('common.actions.back')}
          onPress={onBack}
          testID="booking-back"
        />
      </View>
      <StatusBadge
        phase={phase}
        size="md"
        style={[styles.badge, { left: spacing[4], bottom: spacing[10] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute' },
  badge: { position: 'absolute' },
});
