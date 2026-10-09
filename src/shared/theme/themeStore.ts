import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const themePreferenceSchema = z.enum(THEME_PREFERENCES);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const THEME_STORAGE_KEY = 'theme-preference';

const persistedSchema = z.object({ preference: themePreferenceSchema });

export type ThemeState = {
  preference: ThemePreference;
  /** False until the persisted preference has been read from AsyncStorage. */
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      hydrated: false,
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: THEME_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preference: state.preference }),
      // Storage is a boundary: validate what comes back and fall back to defaults otherwise.
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[theme] failed to read persisted preference', error);
        }
        useThemeStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Read and change the user's theme preference ('system' | 'light' | 'dark'). */
export function useThemePreference(): {
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
} {
  const preference = useThemeStore((state) => state.preference);
  const hydrated = useThemeStore((state) => state.hydrated);
  const setPreference = useThemeStore((state) => state.setPreference);
  return { preference, hydrated, setPreference };
}
