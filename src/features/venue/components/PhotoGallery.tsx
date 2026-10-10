import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import { IconButton } from '@/shared/ui/IconButton';

export type PhotoGalleryProps = {
  photos: readonly string[];
  onBack: () => void;
  onShare: () => void;
};

const GALLERY_HEIGHT = 340;

/** Full-bleed paging photo gallery with page dots and floating back / share buttons. */
export function PhotoGallery({ photos, onBack, onShare }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)));
  };

  return (
    <View style={[styles.root, { height: GALLERY_HEIGHT, backgroundColor: colors.skeletonBase }]}>
      <FlatList
        data={photos}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item, index: i }) => (
          <Image
            source={{ uri: item }}
            contentFit="cover"
            transition={200}
            style={{ width, height: GALLERY_HEIGHT }}
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('venue.gallery.photo', { index: i + 1, total: photos.length })}
          />
        )}
        testID="venue-gallery"
      />
      <LinearGradient
        colors={[colors.overlay, 'transparent', 'transparent', colors.overlay]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[styles.bar, { top: insets.top + spacing[2], paddingHorizontal: spacing[4] }]}
        pointerEvents="box-none"
      >
        <IconButton
          icon={ArrowLeft}
          variant="filled"
          accessibilityLabel={t('venue.gallery.back')}
          onPress={onBack}
          style={{ backgroundColor: colors.surfaceElevated }}
          testID="venue-back"
        />
        <IconButton
          icon={Share2}
          variant="filled"
          accessibilityLabel={t('venue.gallery.share')}
          onPress={onShare}
          style={{ backgroundColor: colors.surfaceElevated }}
          testID="venue-share"
        />
      </View>
      {photos.length > 1 ? (
        <View style={[styles.dots, { bottom: spacing[8], gap: spacing[1] }]} pointerEvents="none">
          {photos.map((uri, i) => (
            <View
              key={uri}
              style={[
                styles.dot,
                { borderRadius: radii.full, backgroundColor: colors.surfaceElevated },
                i === index ? styles.dotActive : styles.dotIdle,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const DOT = 6;

const styles = StyleSheet.create({
  root: { width: '100%' },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: { height: DOT },
  dotActive: { width: DOT * 3, opacity: 1 },
  dotIdle: { width: DOT, opacity: 0.6 },
});
