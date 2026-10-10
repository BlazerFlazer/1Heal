import {
  type FeatureFlagProvider,
  type Flags,
  LocalFlagProvider,
} from '@/shared/config/featureFlags';

import {
  type FeatureFlagsClient,
  fetchFeatureFlagRows,
  flagsFromRows,
  subscribeToFeatureFlagChanges,
} from './repositories/featureFlagsRepository';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

/**
 * Remote feature flags from `public.feature_flags`. A failed fetch rejects, so the store keeps the
 * local defaults and reports `status: 'error'`; a failed refetch after a live change keeps the last
 * known flags. Live updates use Supabase Realtime when it is reachable.
 */
export class SupabaseFlagProvider implements FeatureFlagProvider {
  private readonly client: FeatureFlagsClient;

  constructor(client: FeatureFlagsClient) {
    this.client = client;
  }

  async getFlags(): Promise<Partial<Flags>> {
    return flagsFromRows(await fetchFeatureFlagRows(this.client));
  }

  subscribe(callback: (flags: Partial<Flags>) => void): () => void {
    let active = true;
    const unsubscribe = subscribeToFeatureFlagChanges(this.client, () => {
      this.getFlags().then(
        (flags) => {
          if (active) callback(flags);
        },
        () => undefined,
      );
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }
}

/**
 * Supabase when `EXPO_PUBLIC_AUTH_PROVIDER=supabase` with URL and anon key, otherwise the local
 * defaults (mock auth, tests, offline development).
 */
export function getFlagProvider(): FeatureFlagProvider {
  return isSupabaseConfigured()
    ? new SupabaseFlagProvider(getSupabaseClient())
    : new LocalFlagProvider();
}
