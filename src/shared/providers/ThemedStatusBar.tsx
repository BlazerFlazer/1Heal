import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/shared/theme';

/**
 * Status bar icons follow the resolved theme, not the OS scheme. Android runs edge-to-edge
 * (the default since SDK 53), so the bar itself is transparent and the root view's background
 * is what shows behind it and behind the gesture bar: keep that in sync with the theme too.
 */
export function ThemedStatusBar() {
  const { isDark, colors } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return <StatusBar style={isDark ? 'light' : 'dark'} animated />;
}
