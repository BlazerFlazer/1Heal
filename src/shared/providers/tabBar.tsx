import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';

/** What React Navigation hands to `tabBarIcon` (minus `focused`, which the icons ignore). */
type TabIconProps = { color: ColorValue; size: number };

/** Builds a `tabBarIcon` renderer once, at module scope, so the tab bar never re-creates it. */
export function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, size }: TabIconProps) {
    return <Icon color={color} size={size} />;
  };
}

/** Content height of the tab bar above the home-indicator inset (icon + label + breathing room). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

/** Shared `screenOptions` for the member and partner tab bars: theme tokens only. */
export function useTabBarScreenOptions() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  // Without a home indicator (web, older Android) keep a small bottom padding so labels never clip.
  const bottomPadding = Math.max(insets.bottom, spacing[2]);
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.tabBarActive,
    tabBarInactiveTintColor: colors.tabBarInactive,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
      paddingTop: spacing[1],
      paddingBottom: bottomPadding,
    },
    tabBarLabelStyle: {
      fontFamily: typography.overline.fontFamily,
      fontSize: typography.overline.fontSize,
    },
    sceneStyle: { backgroundColor: colors.background },
  };
}
