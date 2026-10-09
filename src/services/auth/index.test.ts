jest.mock('@/services/api/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({ auth: { onAuthStateChange: jest.fn() } })),
}));

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 0,
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

type AuthModule = typeof import('./index');

function loadAuth(vars: Record<string, string>): AuthModule {
  for (const key of ['AUTH_PROVIDER', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']) {
    delete process.env[`EXPO_PUBLIC_${key}`];
  }
  for (const [key, value] of Object.entries(vars)) {
    process.env[`EXPO_PUBLIC_${key}`] = value;
  }
  let loaded: AuthModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<AuthModule>('./index');
  });
  if (!loaded) throw new Error('auth module did not load');
  return loaded;
}

describe('getAuthService', () => {
  it('uses the mock service by default and memoises it', () => {
    const { getAuthService, MockAuthService } = loadAuth({});
    const service = getAuthService();
    expect(service).toBeInstanceOf(MockAuthService);
    expect(getAuthService()).toBe(service);
  });

  it('uses the Supabase service when configured', () => {
    const { getAuthService, SupabaseAuthService } = loadAuth({
      AUTH_PROVIDER: 'supabase',
      SUPABASE_URL: 'https://xyz.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
    });
    expect(getAuthService()).toBeInstanceOf(SupabaseAuthService);
  });
});
