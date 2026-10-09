import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { THEME_STORAGE_KEY, useThemePreference, useThemeStore } from './themeStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

async function readPersisted(): Promise<unknown> {
  const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe('themeStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ preference: 'system', hydrated: false });
  });

  it('defaults to following the system scheme', () => {
    expect(useThemeStore.getState().preference).toBe('system');
  });

  it('setPreference updates state and persists only the preference', async () => {
    await act(() => {
      useThemeStore.getState().setPreference('dark');
    });
    expect(useThemeStore.getState().preference).toBe('dark');

    await act(async () => {
      await Promise.resolve();
    });
    expect(await readPersisted()).toEqual({ state: { preference: 'dark' }, version: 1 });
  });

  it('marks hydrated after reading storage', async () => {
    expect(useThemeStore.getState().hydrated).toBe(false);
    await act(async () => {
      await useThemeStore.persist.rehydrate();
    });
    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it('restores a valid persisted preference', async () => {
    await AsyncStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { preference: 'light' }, version: 1 }),
    );
    await act(async () => {
      await useThemeStore.persist.rehydrate();
    });
    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('ignores an invalid persisted value', async () => {
    await AsyncStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { preference: 'neon' }, version: 1 }),
    );
    await act(async () => {
      await useThemeStore.persist.rehydrate();
    });
    expect(useThemeStore.getState().preference).toBe('system');
    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it('useThemePreference exposes preference, hydrated and setPreference', async () => {
    const { result } = await renderHook(() => useThemePreference());
    expect(result.current.preference).toBe('system');
    expect(result.current.hydrated).toBe(false);

    await act(() => {
      result.current.setPreference('dark');
    });
    expect(result.current.preference).toBe('dark');
  });
});
