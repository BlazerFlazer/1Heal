import { useEffect, useState } from 'react';

/** Delay between the last keystroke and the catalogue search. */
export const SEARCH_DEBOUNCE_MS = 250;

/** Trails `value` by `delayMs`; an unmount or a newer value cancels the pending update. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
