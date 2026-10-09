import { useFonts } from '@expo-google-fonts/inter';
import { renderHook } from '@testing-library/react-native';

import { APP_FONTS, useAppFonts } from './fonts';
import { fontFamilies, typography } from './tokens';

jest.mock('@expo-google-fonts/inter', () => ({
  __esModule: true,
  Inter_400Regular: 1,
  Inter_500Medium: 2,
  Inter_600SemiBold: 3,
  Inter_700Bold: 4,
  useFonts: jest.fn(() => [true, null]),
}));

describe('fonts', () => {
  it('loads exactly the families referenced by the typography tokens', () => {
    const used = new Set(Object.values(typography).map((variant) => variant.fontFamily));
    expect(Object.keys(APP_FONTS).sort()).toEqual([...used].sort());
    expect(Object.keys(APP_FONTS).sort()).toEqual(Object.values(fontFamilies).sort());
  });

  it('wraps useFonts and returns [loaded, error]', async () => {
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toEqual([true, null]);
    expect(jest.mocked(useFonts)).toHaveBeenCalledWith(APP_FONTS);
  });
});
