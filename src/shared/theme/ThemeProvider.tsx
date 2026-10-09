import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { elevationFor, type ElevationLevel, type ElevationStyle } from './elevation';
import { useThemeStore, type ThemePreference } from './themeStore';
import {
  darkColors,
  lightColors,
  motion,
  radii,
  spacing,
  typography,
  type ColorScheme,
  type ThemeColors,
} from './tokens';

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  elevation: (level: ElevationLevel) => ElevationStyle;
  motion: typeof motion;
  scheme: ColorScheme;
  isDark: boolean;
};

function buildTheme(scheme: ColorScheme): Theme {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return {
    colors,
    spacing,
    radii,
    typography,
    elevation: (level) => elevationFor(colors, level),
    motion,
    scheme,
    isDark: scheme === 'dark',
  };
}

const THEMES: Record<ColorScheme, Theme> = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};

/** The full theme for a scheme; stable identity, safe to use outside React (navigation themes). */
export function getTheme(scheme: ColorScheme): Theme {
  return THEMES[scheme];
}

/** What `useColorScheme()` reports. RN 0.86 adds `'unspecified'`, which resolves to light. */
export type SystemColorScheme = ReturnType<typeof useColorScheme> | null | undefined;

/** User preference wins; 'system' follows the OS, defaulting to light when unknown. */
export function resolveScheme(preference: ThemePreference, system: SystemColorScheme): ColorScheme {
  if (preference === 'system') {
    return system === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

const ThemeContext = createContext<Theme>(THEMES.light);

export type ThemeProviderProps = {
  children: ReactNode;
  /** Forces a scheme regardless of preference (component gallery, tests). */
  scheme?: ColorScheme;
};

export function ThemeProvider({ children, scheme }: ThemeProviderProps) {
  const preference = useThemeStore((state) => state.preference);
  const system = useColorScheme();
  const resolved = scheme ?? resolveScheme(preference, system);
  return <ThemeContext.Provider value={THEMES[resolved]}>{children}</ThemeContext.Provider>;
}

/** Current theme. Outside a provider it falls back to the light theme. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Memoized `StyleSheet.create(factory(theme))`. Define `factory` at module scope so the
 * memo survives re-renders:
 * `const useStyles = (t: Theme) => ({ card: { padding: t.spacing[4] } });`
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}
