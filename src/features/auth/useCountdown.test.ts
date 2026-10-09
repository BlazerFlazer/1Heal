import { act, renderHook } from '@testing-library/react-native';

import { formatCountdown, useCountdown } from './useCountdown';

describe('formatCountdown', () => {
  it('renders m:ss and clamps negatives and fractions', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(29)).toBe('0:29');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(900)).toBe('15:00');
    expect(formatCountdown(-3)).toBe('0:00');
    expect(formatCountdown(7.9)).toBe('0:07');
  });
});

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('counts the initial seconds down to zero', async () => {
    const { result } = await renderHook(() => useCountdown(3));
    expect(result.current).toMatchObject({ seconds: 3, running: true });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toMatchObject({ seconds: 0, running: false });
  });

  it('starts idle, can be restarted and stopped', async () => {
    const { result } = await renderHook(() => useCountdown());
    expect(result.current).toMatchObject({ seconds: 0, running: false });

    await act(async () => {
      result.current.start(5);
    });
    expect(result.current).toMatchObject({ seconds: 5, running: true });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.seconds).toBe(3);

    await act(async () => {
      result.current.stop();
    });
    expect(result.current).toMatchObject({ seconds: 0, running: false });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.seconds).toBe(0);
  });

  it('follows the wall clock, not the number of ticks', async () => {
    const { result } = await renderHook(() => useCountdown(60));
    await act(async () => {
      jest.setSystemTime(Date.now() + 45_000);
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(14);
  });
});
