import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { getAnimatedStyle } from 'react-native-reanimated';

import { i18n } from '@/shared/i18n';
import { haptics } from '@/shared/theme/haptics';
import { durations } from '@/shared/theme/motion';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, spacing, type ColorScheme } from '@/shared/theme/tokens';
import { latestGesture } from '@/shared/ui/gallery/testing/gestureHandlerMock';

import { useToast } from './ToastContext';
import { ToastProvider } from './ToastProvider';
import {
  DEFAULT_TOAST_DURATION_MS,
  ERROR_TOAST_DURATION_MS,
  type ToastOptions,
} from './toastQueue';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    medium: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
    warning: jest.fn(async () => undefined),
    error: jest.fn(async () => undefined),
  },
}));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const useReducedMotion = jest.mocked(Reanimated.useReducedMotion);
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

function Trigger({ options }: { options: ToastOptions }) {
  const toast = useToast();
  return <Pressable testID="show" onPress={() => toast.show(options)} />;
}

function renderToasts(options: ToastOptions, scheme: ColorScheme = 'light') {
  return render(
    <ThemeProvider scheme={scheme}>
      <ToastProvider testID="toasts">
        <Trigger options={options} />
      </ToastProvider>
    </ThemeProvider>,
  );
}

const show = () => fireEvent.press(screen.getByTestId('show'));
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });
const EXIT_MS = durations.fast + 50;

describe('Toast', () => {
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

  it('throws when used outside the provider', async () => {
    await expect(renderHook(() => useToast())).rejects.toThrow('ToastProvider');
  });

  it('shows a polite toast, slides it in, announces it and auto-dismisses', async () => {
    await renderToasts({ message: 'Booking confirmed', tone: 'success' });
    await show();
    const toast = screen.getByTestId('toasts-1');
    expect(screen.getByText('Booking confirmed')).toBeOnTheScreen();
    expect(toast.props.accessibilityLiveRegion).toBe('polite');
    expect(toast.props.accessibilityRole).toBeUndefined();
    expect(getAnimatedStyle(toast)).toMatchObject({
      opacity: 0,
      transform: [{ translateY: -spacing[6] }],
    });
    expect(announce).toHaveBeenCalledWith('Booking confirmed');
    expect(haptics.success).toHaveBeenCalledTimes(1);

    await advance(durations.base + 50);
    expect(getAnimatedStyle(toast)).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });

    await advance(DEFAULT_TOAST_DURATION_MS);
    await advance(EXIT_MS);
    expect(screen.queryByText('Booking confirmed')).toBeNull();
  });

  it('marks errors assertive, plays the error haptic and keeps them longer', async () => {
    await renderToasts({ message: 'Payment failed', tone: 'error' });
    await show();
    const toast = screen.getByTestId('toasts-1');
    expect(toast.props.accessibilityLiveRegion).toBe('assertive');
    expect(toast.props.accessibilityRole).toBe('alert');
    expect(haptics.error).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(toast.props.style).backgroundColor).toBe(lightColors.errorBg);

    await advance(DEFAULT_TOAST_DURATION_MS + EXIT_MS);
    expect(screen.getByText('Payment failed')).toBeOnTheScreen();
    await advance(ERROR_TOAST_DURATION_MS - DEFAULT_TOAST_DURATION_MS + EXIT_MS);
    expect(screen.queryByText('Payment failed')).toBeNull();
  });

  it('plays no haptic for info and neutral tones and follows the dark theme', async () => {
    await renderToasts({ message: 'Heads up', tone: 'info' }, 'dark');
    await show();
    expect(haptics.success).not.toHaveBeenCalled();
    expect(haptics.error).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(screen.getByTestId('toasts-1').props.style).backgroundColor).toBe(
      darkColors.infoBg,
    );
  });

  it('shows at most three toasts, evicting the oldest', async () => {
    await renderToasts({ message: 'Saved' });
    await show();
    await show();
    await show();
    await show();
    expect(screen.getAllByText('Saved')).toHaveLength(3);
    expect(screen.queryByTestId('toasts-1')).toBeNull();
    expect(screen.getByTestId('toasts-4')).toBeOnTheScreen();
  });

  it('runs the action and closes, and closes from the dismiss button', async () => {
    const onPress = jest.fn();
    await renderToasts({ message: 'Removed', action: { label: 'Undo', onPress } });
    await show();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await advance(EXIT_MS);
    expect(screen.queryByText('Removed')).toBeNull();

    await show();
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss notification' }));
    await advance(EXIT_MS);
    expect(screen.queryByText('Removed')).toBeNull();
  });

  it('dismisses on an upward swipe but springs back from a short drag', async () => {
    await renderToasts({ message: 'Swipe me' });
    await show();
    const toast = screen.getByTestId('toasts-1');
    await advance(durations.base + 50);

    await act(async () => {
      latestGesture().callbacks.onUpdate?.({ translationY: -10 });
    });
    expect(getAnimatedStyle(toast).transform).toEqual([{ translateY: -10 }]);
    await act(async () => {
      latestGesture().callbacks.onEnd?.({ translationY: -10, velocityY: 0 }, true);
    });
    await advance(1000);
    expect(getAnimatedStyle(toast).transform).toEqual([{ translateY: 0 }]);
    expect(screen.getByText('Swipe me')).toBeOnTheScreen();

    await act(async () => {
      latestGesture().callbacks.onEnd?.({ translationY: -60, velocityY: 0 }, true);
    });
    await advance(EXIT_MS);
    expect(screen.queryByText('Swipe me')).toBeNull();
  });

  it('only fades under reduce motion', async () => {
    useReducedMotion.mockReturnValue(true);
    await renderToasts({ message: 'Calm' });
    await show();
    expect(getAnimatedStyle(screen.getByTestId('toasts-1'))).toMatchObject({
      opacity: 0,
      transform: [{ translateY: 0 }],
    });
  });
});
