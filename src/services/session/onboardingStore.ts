import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { APP_KEYS } from '@/services/storage/storageKeys';

export interface OnboardingState {
  completed: boolean;
  /** `false` until AsyncStorage has been read; routes wait for it before redirecting. */
  hydrated: boolean;
  complete(): void;
  reset(): void;
}

const persistedSchema = z.object({ completed: z.boolean() });

let markHydrated: () => void = () => undefined;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => {
      markHydrated = () => set({ hydrated: true });
      return {
        completed: false,
        hydrated: false,
        complete: () => set({ completed: true }),
        reset: () => set({ completed: false }),
      };
    },
    {
      name: APP_KEYS.onboarding,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ completed: state.completed }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        return parsed.success ? { ...current, ...parsed.data } : current;
      },
      onRehydrateStorage: () => () => markHydrated(),
    },
  ),
);
