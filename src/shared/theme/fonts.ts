import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { fontFamilies } from './tokens';

/** Font map keyed by the exact `fontFamily` strings used in `typography`. */
export const APP_FONTS = {
  [fontFamilies.regular]: Inter_400Regular,
  [fontFamilies.medium]: Inter_500Medium,
  [fontFamilies.semibold]: Inter_600SemiBold,
  [fontFamilies.bold]: Inter_700Bold,
} as const;

/**
 * Loads Inter. Returns `[loaded, error]`; render the app once either is truthy
 * (keep the splash screen up until then).
 */
export function useAppFonts(): [loaded: boolean, error: Error | null] {
  return useFonts(APP_FONTS);
}
