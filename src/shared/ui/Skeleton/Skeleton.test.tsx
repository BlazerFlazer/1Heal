import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as RNText } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { getAnimatedStyle } from 'react-native-reanimated';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, radii, spacing, type ColorScheme } from '@/shared/theme/tokens';

import { Skeleton } from './Skeleton';
import { SkeletonList } from './SkeletonList';
import { SHIMMER_DURATION_MS } from './useShimmer';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const useReducedMotion = jest.mocked(Reanimated.useReducedMotion);
const CUSTOM_ROW = 'row';

function wrap(ui: React.ReactElement, scheme: ColorScheme = 'light') {
  return render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);
}

function layout(testID: string, width: number) {
  return fireEvent(screen.getByTestId(testID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 16 } },
  });
}

describe('Skeleton', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    useReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders an accessible busy box with the base token and a sweeping highlight', async () => {
    await wrap(<Skeleton.Box testID="box" height={24} radius="md" />);
    const box = screen.getByTestId('box');
    expect(box).toHaveAccessibleName('Loading content');
    expect(box.props.accessibilityRole).toBe('progressbar');
    expect(box.props.accessibilityState).toEqual({ busy: true });
    expect(StyleSheet.flatten(box.props.style)).toMatchObject({
      width: '100%',
      height: 24,
      borderRadius: radii.md,
      backgroundColor: lightColors.skeletonBase,
      overflow: 'hidden',
    });

    const highlight = screen.getByTestId('box-shimmer');
    expect(StyleSheet.flatten(highlight.props.style).backgroundColor).toBe(
      lightColors.skeletonHighlight,
    );
    await layout('box', 200);
    await act(async () => {
      jest.advanceTimersByTime(SHIMMER_DURATION_MS / 4);
    });
    // A quarter of the way through the sweep the band sits about a quarter in from the left.
    expect(getAnimatedStyle(highlight).transform).toEqual([
      { translateX: expect.closeTo(-100, -2) },
    ]);
  });

  it('is static under reduce motion', async () => {
    useReducedMotion.mockReturnValue(true);
    await wrap(<Skeleton.Box testID="box" />);
    expect(screen.queryByTestId('box-shimmer')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('box').props.style).height).toBe(spacing[4]);
  });

  it('uses the dark tokens', async () => {
    await wrap(<Skeleton.Box testID="box" />, 'dark');
    expect(StyleSheet.flatten(screen.getByTestId('box').props.style).backgroundColor).toBe(
      darkColors.skeletonBase,
    );
    expect(StyleSheet.flatten(screen.getByTestId('box-shimmer').props.style).backgroundColor).toBe(
      darkColors.skeletonHighlight,
    );
  });

  it('renders text lines with a shorter last line, announced once', async () => {
    await wrap(<Skeleton.Text testID="text" lines={3} lastLineWidth="50%" />);
    const text = screen.getByTestId('text');
    expect(text.props.accessibilityRole).toBe('progressbar');
    expect(text.children).toHaveLength(3);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    const last = text.children[2];
    expect(typeof last === 'object' && StyleSheet.flatten(last.props.style).width).toBe('50%');
  });

  it('renders a circle with the full radius', async () => {
    await wrap(<Skeleton.Circle testID="circle" size={48} />);
    expect(StyleSheet.flatten(screen.getByTestId('circle').props.style)).toMatchObject({
      width: 48,
      height: 48,
      borderRadius: radii.full,
    });
  });

  it('renders a list of default rows as one busy element, or custom rows', async () => {
    await wrap(<SkeletonList testID="list" count={4} />);
    expect(screen.getByTestId('list').children).toHaveLength(4);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);

    await screen.rerender(
      <ThemeProvider scheme="light">
        <SkeletonList testID="list" count={2} renderItem={() => <RNText>{CUSTOM_ROW}</RNText>} />
      </ThemeProvider>,
    );
    expect(screen.getAllByText(CUSTOM_ROW)).toHaveLength(2);
  });
});
