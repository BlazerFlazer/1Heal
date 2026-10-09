import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { env } from '@/shared/config/env';

/**
 * The single Supabase client. Created lazily so the mock auth provider never touches the network,
 * and only when `EXPO_PUBLIC_AUTH_PROVIDER=supabase` with URL and anon key present.
 * Generated database types land in `./database.types.ts` with M2 (`npm run db:types`).
 */

export type AutoRefreshControls = Pick<
  SupabaseClient['auth'],
  'startAutoRefresh' | 'stopAutoRefresh'
>;

export interface AppStateSource {
  currentState: AppStateStatus;
  addEventListener(type: 'change', listener: (status: AppStateStatus) => void): { remove(): void };
}

/**
 * supabase-js refreshes tokens on a timer only while told the app is in the foreground
 * (React Native has no `visibilitychange`). Returns a function that stops following AppState.
 */
export function bindAutoRefreshToAppState(
  auth: AutoRefreshControls,
  appState: AppStateSource = AppState,
): () => void {
  const apply = (status: AppStateStatus) => {
    void (status === 'active' ? auth.startAutoRefresh() : auth.stopAutoRefresh());
  };
  apply(appState.currentState);
  const subscription = appState.addEventListener('change', apply);
  return () => subscription.remove();
}

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return (
    env.AUTH_PROVIDER === 'supabase' &&
    env.SUPABASE_URL !== undefined &&
    env.SUPABASE_ANON_KEY !== undefined
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (env.AUTH_PROVIDER !== 'supabase' || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase client requested but EXPO_PUBLIC_AUTH_PROVIDER is not "supabase" or ' +
        'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing',
    );
  }
  client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  if (Platform.OS !== 'web') bindAutoRefreshToAppState(client.auth);
  return client;
}
