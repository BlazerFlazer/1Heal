import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as RNText } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { getAnimatedStyle } from 'react-native-reanimated';

import { i18n } from '@/shared/i18n';
import { durations } from '@/shared/theme/motion';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, type ColorScheme } from '@/shared/theme/tokens';
import { latestGesture } from '@/shared/ui/gallery/testing/gestureHandlerMock';

import { Sheet } from './Sheet';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const useReducedMotion = jest.mocked(Reanimated.useReducedMotion);
const BODY = 'Filter options';
const PANEL_HEIGHT = 300;
/** `useWindowDimensions` height under jest-expo. */
const WINDOW_HEIGHT = 1334;

function sheet(visible: boolean, onClose: () => void, scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <Sheet visible={visible} onClose={onClose} title="Filters" testID="sheet">
        <RNText>{BODY}</RNText>
      </Sheet>
    </ThemeProvider>
  );
}

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

async function layoutPanel() {
  await fireEvent(screen.getByTestId('sheet-panel'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 750, height: PANEL_HEIGHT } },
  });
}

describe('Sheet', () => {
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

  it('renders nothing while hidden', async () => {
    await render(sheet(false, jest.fn()));
    expect(screen.queryByTestId('sheet-panel')).toBeNull();
    expect(screen.queryByText(BODY)).toBeNull();
  });

  it('shows title and content, and closes from the backdrop, the handle and the back button', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    expect(screen.getByRole('header', { name: 'Filters' })).toBeOnTheScreen();
    expect(screen.getByText(BODY)).toBeOnTheScreen();
    expect(screen.getByTestId('sheet-panel').props.accessibilityViewIsModal).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Close sheet', includeHiddenElements: true }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Drag down or tap to close' }));
    await act(async () => {
      screen.getByTestId('sheet').props.onRequestClose();
    });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('slides up from below the window and fades the backdrop in', async () => {
    await render(sheet(true, jest.fn()));
    const panel = screen.getByTestId('sheet-panel');
    const backdrop = screen.getByTestId('sheet-backdrop', { includeHiddenElements: true });
    expect(getAnimatedStyle(panel)).toMatchObject({
      opacity: 1,
      transform: [{ translateY: WINDOW_HEIGHT }],
    });
    expect(getAnimatedStyle(backdrop).opacity).toBe(0);

    await layoutPanel();
    await advance(durations.slow + 50);
    expect(getAnimatedStyle(panel)).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
    expect(getAnimatedStyle(backdrop).opacity).toBe(1);
  });

  it('fades instead of sliding under reduce motion', async () => {
    useReducedMotion.mockReturnValue(true);
    await render(sheet(true, jest.fn()));
    const panel = screen.getByTestId('sheet-panel');
    expect(getAnimatedStyle(panel)).toMatchObject({ opacity: 0, transform: [{ translateY: 0 }] });
    await advance(durations.slow + 50);
    expect(getAnimatedStyle(panel)).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it('follows a downward drag, springs back from a short one and closes past the threshold', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    await layoutPanel();
    await advance(durations.slow + 50);
    const panel = screen.getByTestId('sheet-panel');
    expect(latestGesture().config.enabled).toBe(true);

    await act(async () => {
      latestGesture().callbacks.onUpdate?.({ translationY: 40 });
    });
    await advance(1);
    expect(getAnimatedStyle(panel).transform).toEqual([{ translateY: 40 }]);
    await act(async () => {
      latestGesture().callbacks.onUpdate?.({ translationY: -50 });
    });
    await advance(1);
    expect(getAnimatedStyle(panel).transform).toEqual([{ translateY: expect.closeTo(-10) }]);

    await act(async () => {
      latestGesture().callbacks.onEnd?.({ translationY: 20, velocityY: 0 }, true);
    });
    await advance(1500);
    expect(getAnimatedStyle(panel).transform).toEqual([{ translateY: 0 }]);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      latestGesture().callbacks.onEnd?.({ translationY: PANEL_HEIGHT / 2, velocityY: 0 }, true);
    });
    await advance(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('plays the exit animation before unmounting', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    await layoutPanel();
    await advance(durations.slow + 50);

    await screen.rerender(sheet(false, onClose));
    expect(screen.getByText(BODY)).toBeOnTheScreen();
    expect(latestGesture().config.enabled).toBe(false);
    await advance(durations.base + 50);
    expect(screen.queryByText(BODY)).toBeNull();
  });

  it.each<[ColorScheme, string, string]>([
    ['light', lightColors.surfaceElevated, lightColors.overlay],
    ['dark', darkColors.surfaceElevated, darkColors.overlay],
  ])('uses the %s surface and overlay tokens', async (scheme, surface, overlay) => {
    await render(sheet(true, jest.fn(), scheme));
    expect(StyleSheet.flatten(screen.getByTestId('sheet-panel').props.style).backgroundColor).toBe(
      surface,
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }).props.style,
      ).backgroundColor,
    ).toBe(overlay);
  });
});
