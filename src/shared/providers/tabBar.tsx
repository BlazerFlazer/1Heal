import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, type ColorValue } from 'react-native';

import { useTheme } from '@/shared/theme';

/** What React Navigation hands to `tabBarIcon` (minus `focused`, which the icons ignore). */
type TabIconProps = { color: ColorValue; size: number };

/** Builds a `tabBarIcon` renderer once, at module scope, so the tab bar never re-creates it. */
export function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, size }: TabIconProps) {
    return <Icon color={color} size={size} />;
  };
}

/** Shared `screenOptions` for the member and partner tab bars: theme tokens only. */
export function useTabBarScreenOptions() {
  const { colors, typography } = useTheme();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.tabBarActive,
    tabBarInactiveTintColor: colors.tabBarInactive,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    tabBarLabelStyle: {
      fontFamily: typography.overline.fontFamily,
      fontSize: typography.overline.fontSize,
    },
    sceneStyle: { backgroundColor: colors.background },
  };
}
