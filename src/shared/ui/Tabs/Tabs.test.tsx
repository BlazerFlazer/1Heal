import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { getAnimatedStyle } from 'react-native-reanimated';

import { i18n } from '@/shared/i18n';
import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, type ColorScheme } from '@/shared/theme/tokens';

import { Tabs, type TabItem, type TabsProps } from './Tabs';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined) },
}));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const useReducedMotion = jest.mocked(Reanimated.useReducedMotion);

type Key = 'upcoming' | 'past' | 'waitlist';
const ITEMS: readonly TabItem<Key>[] = [
  { key: 'upcoming', label: 'Upcoming', badge: 2 },
  { key: 'past', label: 'Past' },
  { key: 'waitlist', label: 'Waitlist', badge: 'new' },
];
const MANY: readonly TabItem[] = Array.from({ length: 6 }, (_, index) => ({
  key: `tab${index}`,
  label: `Tab ${index}`,
}));

function tabs(props: Partial<TabsProps<Key>> = {}, scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <Tabs testID="tabs" items={ITEMS} value="upcoming" onChange={jest.fn()} {...props} />
    </ThemeProvider>
  );
}

async function layoutTab(testID: string, x: number, width: number) {
  await fireEvent(screen.getByTestId(testID), 'layout', {
    nativeEvent: { layout: { x, y: 0, width, height: 44 } },
  });
}

/** Effect-driven shared-value writes reach the animated style on the next (fake) frame. */
const flushFrame = () =>
  act(async () => {
    jest.advanceTimersByTime(1);
  });

describe('Tabs', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes a tablist with tabs, selected state and badge-aware labels', async () => {
    await render(tabs());
    const list = screen.getByTestId('tabs');
    expect(list.props.accessibilityRole).toBe('tablist');
    expect(list.props.accessibilityLabel).toBe('Tab bar');
    const all = screen.getAllByRole('tab');
    expect(all).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Upcoming, 2', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Past', selected: false })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Waitlist, new' })).toBeOnTheScreen();
    expect(screen.queryByTestId('tabs-scroll')).toBeNull();
  });

  it('calls onChange with a selection haptic, but not for the selected tab', async () => {
    const onChange = jest.fn();
    await render(tabs({ onChange }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Past' }));
    expect(onChange).toHaveBeenCalledWith('past');
    expect(haptics.selection).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('tab', { name: 'Upcoming, 2' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('moves the indicator to the measured frame of the active tab', async () => {
    await render(tabs());
    const indicator = screen.getByTestId('tabs-indicator');
    expect(getAnimatedStyle(indicator).opacity).toBe(0);

    await layoutTab('tabs-upcoming', 0, 100);
    await layoutTab('tabs-past', 100, 120);
    await flushFrame();
    expect(getAnimatedStyle(indicator)).toMatchObject({
      width: 100,
      opacity: 1,
      transform: [{ translateX: 0 }],
    });

    await screen.rerender(tabs({ value: 'past' }));
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    const moved = getAnimatedStyle(indicator);
    expect(moved.width).toBeCloseTo(120, 0);
    expect(moved.transform).toEqual([{ translateX: expect.closeTo(100, 0) }]);
  });

  it('jumps without animating under reduce motion', async () => {
    useReducedMotion.mockReturnValue(true);
    await render(tabs({ value: 'past' }));
    await layoutTab('tabs-upcoming', 0, 100);
    await layoutTab('tabs-past', 100, 120);
    await flushFrame();
    await screen.rerender(tabs({ value: 'upcoming' }));
    await flushFrame();
    expect(getAnimatedStyle(screen.getByTestId('tabs-indicator'))).toMatchObject({
      width: 100,
      opacity: 1,
      transform: [{ translateX: 0 }],
    });
  });

  it('scrolls horizontally when there are many tabs', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Tabs testID="tabs" items={MANY} value="tab0" onChange={jest.fn()} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('tabs-scroll').props.horizontal).toBe(true);
    expect(screen.getAllByRole('tab')).toHaveLength(6);
  });

  it.each<[ColorScheme, string, string]>([
    ['light', lightColors.secondary, lightColors.surfaceElevated],
    ['dark', darkColors.secondary, darkColors.surfaceElevated],
  ])('uses the %s track and indicator tokens', async (scheme, track, indicator) => {
    await render(tabs({}, scheme));
    expect(StyleSheet.flatten(screen.getByTestId('tabs').props.style).backgroundColor).toBe(track);
    expect(
      StyleSheet.flatten(screen.getByTestId('tabs-indicator').props.style).backgroundColor,
    ).toBe(indicator);
  });
});
