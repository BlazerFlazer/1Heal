import type { Theme } from '@/shared/theme/ThemeProvider';
import type { ThemeColors, TypographyVariant } from '@/shared/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonHaptic = 'light' | 'success' | 'none';

export type ButtonPalette = {
  background: string;
  pressedBackground: string;
  foreground: string;
  /** Theme color role of the foreground, for `<Text color>`. */
  foregroundRole: keyof ThemeColors;
  border: string;
  borderWidth: number;
};

export const BUTTON_BORDER_WIDTH = 1;

export function buttonPalette(colors: ThemeColors, variant: ButtonVariant): ButtonPalette {
  switch (variant) {
    case 'primary':
      return {
        background: colors.primary,
        pressedBackground: colors.primaryPressed,
        foreground: colors.onPrimary,
        foregroundRole: 'onPrimary',
        border: 'transparent',
        borderWidth: 0,
      };
    case 'secondary':
      return {
        background: colors.secondary,
        pressedBackground: colors.primarySubtle,
        foreground: colors.onSecondary,
        foregroundRole: 'onSecondary',
        border: 'transparent',
        borderWidth: 0,
      };
    case 'outline':
      return {
        background: 'transparent',
        pressedBackground: colors.surface,
        foreground: colors.primary,
        foregroundRole: 'primary',
        border: colors.borderStrong,
        borderWidth: BUTTON_BORDER_WIDTH,
      };
    case 'ghost':
      return {
        background: 'transparent',
        pressedBackground: colors.surface,
        foreground: colors.primary,
        foregroundRole: 'primary',
        border: 'transparent',
        borderWidth: 0,
      };
    case 'destructive':
      return {
        background: colors.error,
        pressedBackground: colors.error,
        foreground: colors.onError,
        foregroundRole: 'onError',
        border: 'transparent',
        borderWidth: 0,
      };
  }
}

export type ButtonMetrics = {
  height: number;
  paddingHorizontal: number;
  iconSize: number;
  gap: number;
  textVariant: TypographyVariant;
};

/** Heights 40 / 48 / 56 on the 4pt grid. */
export function buttonMetrics(theme: Theme, size: ButtonSize): ButtonMetrics {
  const { spacing } = theme;
  switch (size) {
    case 'sm':
      return {
        height: spacing[10],
        paddingHorizontal: spacing[3],
        iconSize: spacing[4],
        gap: spacing[1],
        textVariant: 'label',
      };
    case 'md':
      return {
        height: spacing[12],
        paddingHorizontal: spacing[4],
        iconSize: spacing[5],
        gap: spacing[2],
        textVariant: 'bodyStrong',
      };
    case 'lg':
      return {
        height: spacing[12] + spacing[2],
        paddingHorizontal: spacing[5],
        iconSize: spacing[5],
        gap: spacing[2],
        textVariant: 'bodyStrong',
      };
  }
}
