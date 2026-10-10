import { z } from 'zod';
import { create } from 'zustand';

import { type AppEnvName, env, MAPS_PROVIDERS } from '@/shared/config/env';

/**
 * Feature flags: local defaults per APP_ENV, optionally overridden by a remote provider.
 * `getFlagProvider()` in `@/services/api/featureFlagProvider` picks `SupabaseFlagProvider`
 * (table `public.feature_flags`, live via Realtime) or `LocalFlagProvider`; the root layout loads it
 * after sign-in through `useFeatureFlagSync`.
 */

export const flagsSchema = z.object({
  'payments.payme': z.boolean(),
  'payments.click': z.boolean(),
  'payments.uzum': z.boolean(),
  partnerMode: z.boolean(),
  waitlist: z.boolean(),
  freeze: z.boolean(),
  newUserPromo: z.boolean(),
  'maps.provider': z.enum(MAPS_PROVIDERS),
});

/** Remote payloads may be partial; unknown keys are dropped, bad values reject the payload. */
export const remoteFlagsSchema = flagsSchema.partial();

export type Flags = z.infer<typeof flagsSchema>;
export type FlagKey = keyof Flags;
export type BooleanFlagKey = {
  [K in FlagKey]: Flags[K] extends boolean ? K : never;
}[FlagKey];

type EnvFlagDefaults = Omit<Flags, 'maps.provider'>;

/** Local defaults. `maps.provider` always follows `EXPO_PUBLIC_MAPS_PROVIDER`. */
const DEFAULTS_BY_ENV: Record<AppEnvName, EnvFlagDefaults> = {
  dev: {
    'payments.payme': true,
    'payments.click': true,
    'payments.uzum': true,
    partnerMode: true,
    waitlist: true,
    freeze: true,
    newUserPromo: true,
  },
  staging: {
    'payments.payme': true,
    'payments.click': true,
    'payments.uzum': true,
    partnerMode: true,
    waitlist: true,
    freeze: true,
    newUserPromo: true,
  },
  production: {
    // Payment providers stay dark until their live credentials are verified (M5).
    'payments.payme': false,
    'payments.click': false,
    'payments.uzum': false,
    partnerMode: true,
    waitlist: true,
    freeze: true,
    newUserPromo: false,
  },
};

export function getDefaultFlags(appEnv: AppEnvName = env.APP_ENV): Flags {
  return { ...DEFAULTS_BY_ENV[appEnv], 'maps.provider': env.MAPS_PROVIDER };
}

export interface FeatureFlagProvider {
  getFlags(): Promise<Partial<Flags>>;
  /** Optional live updates; returns an unsubscribe function. */
  subscribe?(callback: (flags: Partial<Flags>) => void): () => void;
}

/** Static overrides on top of the local defaults (dev builds, tests, the component gallery). */
export class LocalFlagProvider implements FeatureFlagProvider {
  private readonly overrides: Partial<Flags>;

  constructor(overrides: Partial<Flags> = {}) {
    this.overrides = { ...overrides };
  }

  getFlags(): Promise<Partial<Flags>> {
    return Promise.resolve({ ...this.overrides });
  }
}

export type FeatureFlagsStatus = 'defaults' | 'loading' | 'ready' | 'error';

export interface FeatureFlagsState {
  flags: Flags;
  remote: Partial<Flags>;
  status: FeatureFlagsStatus;
  /** Validates and merges a remote payload over the defaults; invalid payloads are ignored. */
  applyRemote(payload: unknown): boolean;
  /** Fetches once, then follows live updates when the provider supports them. */
  load(provider: FeatureFlagProvider): Promise<() => void>;
  reset(): void;
}

function mergeFlags(remote: Partial<Flags>): Flags {
  const merged: Flags = getDefaultFlags();
  for (const key of Object.keys(remote) as FlagKey[]) {
    const value = remote[key];
    if (value !== undefined) {
      (merged as Record<FlagKey, Flags[FlagKey]>)[key] = value;
    }
  }
  return merged;
}

const noop = (): void => undefined;

export const useFeatureFlags = create<FeatureFlagsState>()((set, get) => ({
  flags: getDefaultFlags(),
  remote: {},
  status: 'defaults',

  applyRemote: (payload) => {
    const parsed = remoteFlagsSchema.safeParse(payload);
    if (!parsed.success) return false;
    const remote = { ...get().remote, ...parsed.data };
    set({ remote, flags: mergeFlags(remote), status: 'ready' });
    return true;
  },

  load: async (provider) => {
    set({ status: 'loading' });
    try {
      const applied = get().applyRemote(await provider.getFlags());
      set({ status: applied ? 'ready' : 'error' });
    } catch {
      set({ status: 'error' });
    }
    return provider.subscribe?.((flags) => get().applyRemote(flags)) ?? noop;
  },

  reset: () => set({ flags: getDefaultFlags(), remote: {}, status: 'defaults' }),
}));

/** Non-reactive read for code outside React (services, routing guards). */
export function isEnabled(key: BooleanFlagKey): boolean {
  return useFeatureFlags.getState().flags[key];
}

/** Reactive read for components. */
export function useFlag<K extends FlagKey>(key: K): Flags[K] {
  return useFeatureFlags((state) => state.flags[key]);
}
