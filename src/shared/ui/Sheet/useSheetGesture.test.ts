import {
  SHEET_DISMISS_RATIO,
  SHEET_DISMISS_VELOCITY,
  SHEET_OVERDRAG_RESISTANCE,
  sheetDragOffset,
  shouldDismissSheet,
} from './useSheetGesture';

describe('useSheetGesture helpers', () => {
  it('follows downward drags and rubber-bands upward ones', () => {
    expect(sheetDragOffset(0)).toBe(0);
    expect(sheetDragOffset(120)).toBe(120);
    expect(sheetDragOffset(-100)).toBeCloseTo(-100 * SHEET_OVERDRAG_RESISTANCE);
  });

  it('dismisses past the distance ratio or on a fast fling', () => {
    const height = 400;
    expect(shouldDismissSheet(height * SHEET_DISMISS_RATIO + 1, 0, height)).toBe(true);
    expect(shouldDismissSheet(height * SHEET_DISMISS_RATIO - 1, 0, height)).toBe(false);
    expect(shouldDismissSheet(10, SHEET_DISMISS_VELOCITY + 1, height)).toBe(true);
    expect(shouldDismissSheet(10, SHEET_DISMISS_VELOCITY - 1, height)).toBe(false);
    expect(shouldDismissSheet(-200, -2000, height)).toBe(false);
  });
});
