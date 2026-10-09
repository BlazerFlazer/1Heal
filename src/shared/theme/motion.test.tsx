import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import Animated, { getAnimatedStyle } from 'react-native-reanimated';
import * as Reanimated from 'react-native-reanimated';

import { durations, usePressAnimation, useReduceMotion } from './motion';
import { motion } from './tokens';

jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    useReducedMotion: jest.fn(() => false),
    withSpring: jest.fn(actual.withSpring),
  };
});

const useReducedMotionMock = jest.mocked(Reanimated.useReducedMotion);
const withSpringMock = jest.mocked(Reanimated.withSpring);

function Probe() {
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View
      testID="probe"
      style={animatedStyle}
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
    />
  );
}

describe('motion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    withSpringMock.mockClear();
    useReducedMotionMock.mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('re-exports durations from tokens', () => {
    expect(durations).toBe(motion.durations);
  });

  it('useReduceMotion mirrors the system setting', async () => {
    useReducedMotionMock.mockReturnValue(true);
    const { result } = await renderHook(() => useReduceMotion());
    expect(result.current).toBe(true);
  });

  it('springs to pressScale on press in and back to 1 on press out', async () => {
    await render(<Probe />);
    const view = screen.getByTestId('probe');
    expect(getAnimatedStyle(view)).toEqual({ transform: [{ scale: 1 }] });

    await fireEvent(view, 'touchStart');
    expect(withSpringMock).toHaveBeenCalledWith(motion.pressScale, motion.spring);

    await fireEvent(view, 'touchEnd');
    expect(withSpringMock).toHaveBeenLastCalledWith(1, motion.spring);
  });

  it('is a no-op under reduce motion', async () => {
    useReducedMotionMock.mockReturnValue(true);
    await render(<Probe />);
    const view = screen.getByTestId('probe');

    await fireEvent(view, 'touchStart');
    jest.advanceTimersByTime(1000);
    await fireEvent(view, 'touchEnd');
    jest.advanceTimersByTime(1000);

    expect(withSpringMock).not.toHaveBeenCalled();
    expect(getAnimatedStyle(view)).toEqual({ transform: [{ scale: 1 }] });
  });
});
