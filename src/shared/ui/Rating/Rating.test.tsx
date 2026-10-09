import { fireEvent, render, screen } from '@testing-library/react-native';

import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, spacing } from '@/shared/theme/tokens';

import { clampRating, Rating } from './Rating';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined) },
}));

const label = 'Rating';
/** Interactive stars are hidden from assistive tech by design; queries must opt in. */
const hidden = { includeHiddenElements: true } as const;

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function fillWidth(testID: string): number | undefined {
  const fill = screen.queryByTestId(`${testID}-fill`);
  return fill
    ? fill.props.style.find((s: { width?: number }) => s?.width !== undefined)?.width
    : undefined;
}

type HostNode = ReturnType<typeof screen.getByTestId>;

/** First descendant host element carrying `prop` (lucide puts `stroke`/`fill` on the SVG tree). */
function findProp(node: HostNode | string, prop: string): unknown {
  if (typeof node === 'string') return undefined;
  if (node.props[prop] !== undefined) return node.props[prop];
  for (const child of node.children) {
    const found = findProp(child, prop);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe('clampRating', () => {
  it('rounds to halves inside 0..5', () => {
    expect(clampRating(3.74)).toBe(3.5);
    expect(clampRating(3.75)).toBe(4);
    expect(clampRating(-2)).toBe(0);
    expect(clampRating(9)).toBe(5);
    expect(clampRating(Number.NaN)).toBe(0);
  });
});

describe('Rating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays full, half and empty stars read-only as a labelled image with a value', async () => {
    await renderDark(
      <Rating value={3.5} accessibilityLabel={label} valueText="3.5 of 5" testID="r" />,
    );
    const rating = screen.getByRole('image', { name: label });
    expect(rating).toHaveAccessibilityValue({ min: 0, max: 5, now: 3.5, text: '3.5 of 5' });
    expect(rating.props.accessibilityActions).toBeUndefined();
    expect(fillWidth('r-star-0')).toBe(spacing[6]);
    expect(fillWidth('r-star-2')).toBe(spacing[6]);
    expect(fillWidth('r-star-3')).toBe(spacing[6] / 2);
    expect(fillWidth('r-star-4')).toBeUndefined();
    expect(screen.queryByTestId('r-press-0')).toBeNull();
  });

  it('uses theme colors for filled and empty stars in both schemes', async () => {
    await renderDark(<Rating value={1} accessibilityLabel={label} testID="r" />);
    expect(findProp(screen.getByTestId('r-star-0-fill'), 'fill')).toBe(darkColors.warning);
    expect(findProp(screen.getByTestId('r-star-4'), 'stroke')).toBe(darkColors.borderStrong);

    await render(
      <ThemeProvider scheme="light">
        <Rating value={1} accessibilityLabel={label} testID="l" />
      </ThemeProvider>,
    );
    expect(findProp(screen.getByTestId('l-star-0-fill'), 'fill')).toBe(lightColors.warning);
    expect(findProp(screen.getByTestId('l-star-4'), 'stroke')).toBe(lightColors.borderStrong);
  });

  it('is adjustable when interactive: taps set whole stars, a11y actions step by one', async () => {
    const onChange = jest.fn();
    await renderDark(
      <Rating value={2} onChange={onChange} accessibilityLabel={label} testID="r" />,
    );
    const rating = screen.getByRole('adjustable', { name: label });
    expect(rating.props.accessibilityActions).toEqual([
      { name: 'increment' },
      { name: 'decrement' },
    ]);

    expect(screen.queryByTestId('r-press-4')).toBeNull();
    await fireEvent.press(screen.getByTestId('r-press-4', hidden));
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(haptics.selection).toHaveBeenCalledTimes(1);

    await fireEvent(rating, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
    await fireEvent(rating, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('r-press-0', hidden).props.hitSlop).toBe((44 - spacing[6]) / 2);
  });

  it('ignores no-op changes and clamps at the ends', async () => {
    const onChange = jest.fn();
    await renderDark(
      <Rating value={5} onChange={onChange} accessibilityLabel={label} testID="r" />,
    );
    await fireEvent.press(screen.getByTestId('r-press-4', hidden));
    await fireEvent(screen.getByTestId('r'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(haptics.selection).not.toHaveBeenCalled();
  });

  it('stays read-only when readOnly is set even with onChange', async () => {
    const onChange = jest.fn();
    await renderDark(
      <Rating value={2} onChange={onChange} readOnly accessibilityLabel={label} testID="r" />,
    );
    expect(screen.getByRole('image', { name: label })).toBeOnTheScreen();
    expect(screen.queryByTestId('r-press-0', hidden)).toBeNull();
  });

  it('scales star size with the size prop', async () => {
    await renderDark(
      <>
        <Rating value={1} size="sm" accessibilityLabel={label} testID="sm" />
        <Rating value={1} size="lg" accessibilityLabel={label} testID="lg" />
      </>,
    );
    expect(screen.getByTestId('sm-star-0')).toHaveStyle({ width: spacing[4] });
    expect(screen.getByTestId('lg-star-0')).toHaveStyle({ width: spacing[8] });
  });
});
