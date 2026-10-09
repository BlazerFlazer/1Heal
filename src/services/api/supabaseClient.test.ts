import { createClient } from '@supabase/supabase-js';
import type { AppStateStatus } from 'react-native';

import type { AppStateSource } from './supabaseClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() },
  })),
}));

type ClientModule = typeof import('./supabaseClient');

function loadModule(vars: Record<string, string>): ClientModule {
  for (const key of ['AUTH_PROVIDER', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']) {
    delete process.env[`EXPO_PUBLIC_${key}`];
  }
  for (const [key, value] of Object.entries(vars)) {
    process.env[`EXPO_PUBLIC_${key}`] = value;
  }
  let loaded: ClientModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<ClientModule>('./supabaseClient');
  });
  if (!loaded) throw new Error('module did not load');
  return loaded;
}

function fakeAppState(initial: AppStateStatus) {
  let listener: ((status: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const source: AppStateSource = {
    currentState: initial,
    addEventListener: (_type, cb) => {
      listener = cb;
      return { remove };
    },
  };
  return { source, remove, change: (status: AppStateStatus) => listener?.(status) };
}

describe('getSupabaseClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the mock provider is configured', () => {
    const { getSupabaseClient, isSupabaseConfigured } = loadModule({ AUTH_PROVIDER: 'mock' });
    expect(isSupabaseConfigured()).toBe(false);
    expect(() => getSupabaseClient()).toThrow(/EXPO_PUBLIC_AUTH_PROVIDER/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('creates one client with AsyncStorage-backed, non-URL session handling', () => {
    const { getSupabaseClient, isSupabaseConfigured } = loadModule({
      AUTH_PROVIDER: 'supabase',
      SUPABASE_URL: 'https://xyz.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    });
    expect(isSupabaseConfigured()).toBe(true);
    const first = getSupabaseClient();
    const second = getSupabaseClient();
    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://xyz.supabase.co', 'anon', {
      auth: expect.objectContaining({
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: expect.objectContaining({ getItem: expect.any(Function) }),
      }),
    });
    const started = (first.auth.startAutoRefresh as jest.Mock).mock.calls.length;
    const stopped = (first.auth.stopAutoRefresh as jest.Mock).mock.calls.length;
    expect(started + stopped).toBe(1);
  });
});

describe('bindAutoRefreshToAppState', () => {
  it('starts in the foreground, stops in the background and can be detached', () => {
    const { bindAutoRefreshToAppState } = loadModule({ AUTH_PROVIDER: 'mock' });
    const auth = { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() };
    const appState = fakeAppState('active');

    const detach = bindAutoRefreshToAppState(auth, appState.source);
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);

    appState.change('background');
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    appState.change('active');
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(2);

    detach();
    expect(appState.remove).toHaveBeenCalled();
  });
});
