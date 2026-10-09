import { useCallback, useEffect, useState } from 'react';

export type Countdown = {
  /** Whole seconds left; 0 when idle. */
  seconds: number;
  running: boolean;
  start: (seconds: number) => void;
  stop: () => void;
};

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

function deadlineFor(seconds: number): number | null {
  return seconds > 0 ? Date.now() + seconds * MS_PER_SECOND : null;
}

/**
 * Second-by-second countdown anchored to a wall-clock deadline, so time spent in the background
 * (where JS timers pause) is not lost when the app comes back.
 */
export function useCountdown(initialSeconds = 0): Countdown {
  const [deadline, setDeadline] = useState<number | null>(() => deadlineFor(initialSeconds));
  const [seconds, setSeconds] = useState(Math.max(0, initialSeconds));

  useEffect(() => {
    if (deadline === null) {
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / MS_PER_SECOND));
      setSeconds(remaining);
      if (remaining === 0) {
        setDeadline(null);
      }
    };
    tick();
    const id = setInterval(tick, MS_PER_SECOND);
    return () => clearInterval(id);
  }, [deadline]);

  const start = useCallback((next: number) => {
    setSeconds(Math.max(0, next));
    setDeadline(deadlineFor(next));
  }, []);

  const stop = useCallback(() => {
    setSeconds(0);
    setDeadline(null);
  }, []);

  return { seconds, running: seconds > 0, start, stop };
}

/** "0:29", "1:05", "15:00". */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / SECONDS_PER_MINUTE);
  const seconds = safe % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
