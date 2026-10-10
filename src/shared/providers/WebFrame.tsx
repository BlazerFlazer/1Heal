import { LinearGradient } from 'expo-linear-gradient';
import { HeartPulse } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaFrameContext, type Rect } from 'react-native-safe-area-context';

import { BRAND_NAME } from '@/shared/config/brand';
import { palette, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

/** Below this browser width the app fills the window like on a phone. */
export const WEB_FRAME_MIN_WIDTH = 600;
const CAPTION_MIN_WIDTH = 1000;
const FRAME_MAX_WIDTH = 430;
const FRAME_MAX_HEIGHT = 932;
const CAPTION_MAX_WIDTH = 340;

export type WebFrameProps = { children: ReactNode };

/**
 * Desktop web preview only: renders the app inside a centred phone-sized frame over a soft brand
 * backdrop. Native and narrow browsers get `children` unchanged.
 */
export function WebFrame({ children }: WebFrameProps) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < WEB_FRAME_MIN_WIDTH) {
    return children;
  }
  return <FramedApp showCaption={width >= CAPTION_MIN_WIDTH}>{children}</FramedApp>;
}

function FramedApp({ children, showCaption }: WebFrameProps & { showCaption: boolean }) {
  const { t } = useTranslation();
  const { colors, spacing, radii, elevation, isDark } = useTheme();
  const window = useWindowDimensions();
  const pad = spacing[6];
  // Seeded from the window so the first render already has a phone-sized frame; onLayout refines.
  const [frame, setFrame] = useState<Rect>(() => ({
    x: 0,
    y: 0,
    width: Math.min(FRAME_MAX_WIDTH, window.width - pad * 2),
    height: Math.min(FRAME_MAX_HEIGHT, window.height - pad * 2),
  }));
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== frame.width || height !== frame.height) setFrame({ x: 0, y: 0, width, height });
  };
  const backdrop = isDark
    ? ([colors.background, colors.surface] as const)
    : ([palette.green[50], palette.green[100]] as const);

  return (
    <LinearGradient
      colors={backdrop}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      testID="web-frame"
      style={[styles.backdrop, { padding: pad, gap: spacing[16] }]}
    >
      {showCaption ? (
        <View style={[styles.caption, { gap: spacing[4] }]}>
          <View
            style={[
              styles.mark,
              {
                width: spacing[16],
                height: spacing[16],
                borderRadius: radii.md,
                backgroundColor: colors.primary,
              },
            ]}
          >
            <HeartPulse size={spacing[8]} color={colors.onPrimary} />
          </View>
          <Text variant="display">{BRAND_NAME}</Text>
          <Text variant="subtitle" color="textSecondary">
            {t('home.tagline')}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('home.webCaption')}
          </Text>
        </View>
      ) : null}
      <View
        onLayout={onLayout}
        style={[
          styles.frame,
          {
            borderRadius: spacing[8],
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
          elevation(3),
        ]}
      >
        <SafeAreaFrameContext.Provider value={frame}>{children}</SafeAreaFrameContext.Provider>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  caption: { maxWidth: CAPTION_MAX_WIDTH },
  mark: { alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '100%',
    maxWidth: FRAME_MAX_WIDTH,
    height: '100%',
    maxHeight: FRAME_MAX_HEIGHT,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
