import { act, renderHook } from '@testing-library/react-native';

import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with the initial value and trails later ones by the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, SEARCH_DEBOUNCE_MS),
      { initialProps: { value: '' } },
    );
    expect(result.current).toBe('');

    await rerender({ value: 'yo' });
    expect(result.current).toBe('');

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('yo');
  });

  it('only emits the latest value when keystrokes arrive faster than the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, SEARCH_DEBOUNCE_MS),
      { initialProps: { value: '' } },
    );

    await rerender({ value: 'y' });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS / 2);
    });
    await rerender({ value: 'yoga' });
    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS / 2);
    });
    expect(result.current).toBe('');

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS / 2);
    });
    expect(result.current).toBe('yoga');
  });
});
