/**
 * Design tokens. This is the ONLY file in the app allowed to contain literal colors
 * (`architecture.test.ts` enforces it). Everything else reads colors through `useTheme()`.
 * Every text/background role pairing is checked for WCAG AA in `contrast.test.ts`.
 */
import type { TextStyle } from 'react-native';

export { elevationFor } from './elevation';
export type { ElevationLevel, ElevationStyle } from './elevation';

export type ColorScheme = 'light' | 'dark';

const green = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
  900: '#14532D',
} as const;
const amber = { 50: '#FFFBEB', 300: '#FCD34D', 500: '#F59E0B', 800: '#92400E' } as const;
const red = {
  50: '#FEF2F2',
  300: '#FCA5A5',
  400: '#F87171',
  600: '#DC2626',
  800: '#991B1B',
} as const;
const sky = {
  50: '#F0F9FF',
  300: '#7DD3FC',
  400: '#38BDF8',
  500: '#0EA5E9',
  800: '#075985',
} as const;
const white = '#FFFFFF';

const neutralLight = {
  background: white,
  surface: '#F7FBF8',
  surfaceElevated: white,
  border: '#E3EFE7',
  textPrimary: '#0F1F17',
  textSecondary: '#4B5F54',
  textDisabled: '#9AAEA1',
} as const;
const neutralDark = {
  background: '#0B1511',
  surface: '#12201A',
  surfaceElevated: '#17291F',
  border: '#223629',
  textPrimary: '#E8F5EC',
  textSecondary: '#9DB8A7',
  textDisabled: '#6F8A79',
} as const;

/** Raw palette. Prefer the semantic `ThemeColors` roles; the palette is for building themes. */
export const palette = {
  green,
  amber,
  red,
  sky,
  white,
  neutral: { light: neutralLight, dark: neutralDark },
  semantic: { success: green[600], warning: amber[500], error: red[600], info: sky[500] },
} as const;

/** Semantic color roles. `on*` is the foreground that passes AA on the role it is named after. */
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  primary: string;
  onPrimary: string;
  primaryPressed: string;
  primarySubtle: string;
  onPrimarySubtle: string;
  /** Subtle surface button background. */
  secondary: string;
  onSecondary: string;
  success: string;
  onSuccess: string;
  successBg: string;
  onSuccessBg: string;
  warning: string;
  onWarning: string;
  warningBg: string;
  onWarningBg: string;
  error: string;
  onError: string;
  errorBg: string;
  onErrorBg: string;
  info: string;
  onInfo: string;
  infoBg: string;
  onInfoBg: string;
  /** rgba scrim behind sheets and dialogs. */
  overlay: string;
  skeletonBase: string;
  skeletonHighlight: string;
  /** Green-tinted shadow color used by `elevationFor`. */
  shadow: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBackground: string;
  focusRing: string;
};

export const lightColors: ThemeColors = {
  ...neutralLight,
  borderStrong: '#749080',
  textInverse: white,
  primary: green[700],
  onPrimary: white,
  primaryPressed: green[800],
  primarySubtle: green[100],
  onPrimarySubtle: green[900],
  secondary: '#E8F1EB',
  onSecondary: green[800],
  success: green[700],
  onSuccess: white,
  successBg: green[100],
  onSuccessBg: green[900],
  warning: amber[500],
  onWarning: neutralLight.textPrimary,
  warningBg: amber[50],
  onWarningBg: amber[800],
  error: red[600],
  onError: white,
  errorBg: red[50],
  onErrorBg: red[800],
  info: sky[500],
  onInfo: neutralLight.textPrimary,
  infoBg: sky[50],
  onInfoBg: sky[800],
  overlay: 'rgba(5, 20, 12, 0.55)',
  skeletonBase: '#E9F1EC',
  skeletonHighlight: '#F6FAF7',
  shadow: '#0F3D22',
  tabBarActive: green[700],
  tabBarInactive: neutralLight.textSecondary,
  inputBackground: '#F2F7F4',
  focusRing: green[600],
};

export const darkColors: ThemeColors = {
  ...neutralDark,
  borderStrong: '#5E7866',
  textInverse: neutralDark.background,
  primary: green[400],
  onPrimary: neutralDark.background,
  primaryPressed: green[500],
  primarySubtle: '#163A26',
  onPrimarySubtle: green[200],
  secondary: '#1C2F25',
  onSecondary: green[200],
  success: green[400],
  onSuccess: neutralDark.background,
  successBg: '#13301E',
  onSuccessBg: green[300],
  warning: amber[500],
  onWarning: neutralDark.background,
  warningBg: '#33250F',
  onWarningBg: amber[300],
  error: red[400],
  onError: neutralDark.background,
  errorBg: '#3B1515',
  onErrorBg: red[300],
  info: sky[400],
  onInfo: neutralDark.background,
  infoBg: '#0C2A3A',
  onInfoBg: sky[300],
  overlay: 'rgba(0, 0, 0, 0.65)',
  skeletonBase: '#1A2C22',
  skeletonHighlight: '#243A2D',
  shadow: '#020805',
  tabBarActive: green[400],
  tabBarInactive: neutralDark.textSecondary,
  inputBackground: '#0F1C15',
  focusRing: green[400],
};

export const themeColors: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/** 4pt grid. Use `spacing[4]` (16) as the default screen gutter. */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
export type SpacingKey = keyof typeof spacing;

export const radii = { sm: 12, md: 16, lg: 24, full: 999 } as const;
export type RadiusKey = keyof typeof radii;

/** Minimum hit target (pt) for every interactive element. */
export const MIN_TOUCH = 44;

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
export type FontFamily = (typeof fontFamilies)[keyof typeof fontFamilies];

export type TypographyStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'letterSpacing'> & {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
};

export const typography = {
  display: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fontFamilies.semibold, fontSize: 24, lineHeight: 32 },
  subtitle: { fontFamily: fontFamilies.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamilies.medium, fontSize: 14, lineHeight: 20 },
  overline: { fontFamily: fontFamilies.medium, fontSize: 11, lineHeight: 16, letterSpacing: 0.6 },
} as const satisfies Record<string, TypographyStyle>;
export type TypographyVariant = keyof typeof typography;

export const motion = {
  durations: { fast: 150, base: 200, slow: 300 },
  spring: { damping: 18, stiffness: 260, mass: 0.8 },
  pressScale: 0.97,
} as const;

export const zIndex = {
  base: 0,
  raised: 1,
  sticky: 10,
  dropdown: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;
