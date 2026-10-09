type EnvModule = typeof import('./env');

const KEYS = [
  'APP_ENV',
  'AUTH_PROVIDER',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'MAPS_PROVIDER',
  'YANDEX_MAPS_KEY',
  'GOOGLE_MAPS_KEY',
  'SENTRY_ENABLED',
  'SENTRY_DSN',
  'ANALYTICS_ENABLED',
  'POSTHOG_KEY',
  'POSTHOG_HOST',
] as const;

function loadEnv(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}): EnvModule {
  for (const key of KEYS) {
    delete process.env[`EXPO_PUBLIC_${key}`];
  }
  for (const [key, value] of Object.entries(overrides)) {
    process.env[`EXPO_PUBLIC_${key}`] = value;
  }
  let loaded: EnvModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<EnvModule>('./env');
  });
  if (!loaded) throw new Error('env module did not load');
  return loaded;
}

describe('env', () => {
  it('applies defaults when nothing is set', () => {
    const { env, isDev, isProduction } = loadEnv();
    expect(env).toEqual({
      APP_ENV: 'dev',
      AUTH_PROVIDER: 'mock',
      MAPS_PROVIDER: 'yandex',
      SENTRY_ENABLED: false,
      ANALYTICS_ENABLED: false,
    });
    expect(isDev).toBe(true);
    expect(isProduction).toBe(false);
  });

  it('treats blank values from .env as unset', () => {
    const { env } = loadEnv({ SUPABASE_URL: '   ', APP_ENV: '', SENTRY_DSN: '' });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.APP_ENV).toBe('dev');
  });

  it('parses a full production configuration', () => {
    const { env, isDev, isProduction } = loadEnv({
      APP_ENV: 'production',
      AUTH_PROVIDER: 'supabase',
      SUPABASE_URL: 'https://xyz.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      MAPS_PROVIDER: 'google',
      GOOGLE_MAPS_KEY: 'gmaps',
      SENTRY_ENABLED: 'true',
      SENTRY_DSN: 'https://abc@o1.ingest.sentry.io/1',
      ANALYTICS_ENABLED: '1',
      POSTHOG_KEY: 'phc_1',
      POSTHOG_HOST: 'https://eu.posthog.com',
    });
    expect(env.APP_ENV).toBe('production');
    expect(env.AUTH_PROVIDER).toBe('supabase');
    expect(env.SUPABASE_URL).toBe('https://xyz.supabase.co');
    expect(env.MAPS_PROVIDER).toBe('google');
    expect(env.SENTRY_ENABLED).toBe(true);
    expect(env.ANALYTICS_ENABLED).toBe(true);
    expect(isDev).toBe(false);
    expect(isProduction).toBe(true);
  });

  it.each([
    ['true', true],
    ['false', false],
    ['yes', true],
    ['no', false],
    ['on', true],
    ['off', false],
    ['1', true],
    ['0', false],
  ])('parses boolean-ish %s as %s', (input, expected) => {
    const { env } = loadEnv({ SENTRY_ENABLED: input });
    expect(env.SENTRY_ENABLED).toBe(expected);
  });

  it('throws a clear error listing every bad key', () => {
    expect(() =>
      loadEnv({ APP_ENV: 'prod', SUPABASE_URL: 'not a url', SENTRY_ENABLED: 'maybe' }),
    ).toThrow(/EXPO_PUBLIC_APP_ENV.*EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SENTRY_ENABLED/s);
  });

  it('exposes the offending keys on the error', () => {
    const { parseEnv, readRawEnv, EnvValidationError } = loadEnv();
    try {
      parseEnv({ ...readRawEnv(), MAPS_PROVIDER: '2gis' });
      throw new Error('expected parseEnv to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as InstanceType<typeof EnvValidationError>).keys).toEqual([
        'EXPO_PUBLIC_MAPS_PROVIDER',
      ]);
    }
  });

  it('requires Supabase URL and key when the supabase auth provider is selected', () => {
    expect(() => loadEnv({ AUTH_PROVIDER: 'supabase' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL.*EXPO_PUBLIC_SUPABASE_ANON_KEY/s,
    );
  });
});
