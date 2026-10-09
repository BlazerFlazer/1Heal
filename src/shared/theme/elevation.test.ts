import { Platform } from 'react-native';

import { elevationFor } from './elevation';
import { darkColors, lightColors } from './tokens';

describe('elevationFor', () => {
  it('returns native shadow styles tinted with the theme shadow color', () => {
    const style = elevationFor(lightColors, 2);
    expect(style).toEqual({
      shadowColor: lightColors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    });
    expect(elevationFor(darkColors, 2).shadowColor).toBe(darkColors.shadow);
  });

  it('is flat at level 0 and grows with level', () => {
    const levels = [0, 1, 2, 3] as const;
    const radii = levels.map((level) => elevationFor(lightColors, level).shadowRadius ?? 0);
    expect(radii[0]).toBe(0);
    expect(elevationFor(lightColors, 0).elevation).toBe(0);
    expect([...radii]).toEqual([...radii].sort((a, b) => a - b));
  });

  it('uses a boxShadow string on web', () => {
    // RN's per-platform `Platform.select` ignores `Platform.OS`, so stub both like web would.
    const restoreOs = jest.replaceProperty(Platform, 'OS', 'web');
    const select = jest
      .spyOn(Platform, 'select')
      .mockImplementation((spec: { web?: unknown; default?: unknown }) =>
        'web' in spec ? spec.web : spec.default,
      );
    try {
      expect(elevationFor(lightColors, 0)).toEqual({ boxShadow: 'none' });
      const web = elevationFor(lightColors, 3);
      expect(web.boxShadow).toBe(`0 10px 24px ${lightColors.shadow}24`);
      expect(web.shadowColor).toBeUndefined();
    } finally {
      select.mockRestore();
      restoreOs.restore();
    }
  });
});
