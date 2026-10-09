import { z } from 'zod';

/**
 * Public runtime configuration. Only `EXPO_PUBLIC_*` variables reach the bundle and they are public
 * by definition (see `.env.example`). Everything is validated once, at import time.
 */

export const APP_ENV_NAMES = ['dev', 'staging', 'production'] as const;
export type AppEnvName = (typeof APP_ENV_NAMES)[number];

export const AUTH_PROVIDERS = ['mock', 'supabase'] as const;
export type AuthProviderName = (typeof AUTH_PROVIDERS)[number];

export const MAPS_PROVIDERS = ['yandex', 'google'] as const;
export type MapsProviderName = (typeof MAPS_PROVIDERS)[number];

const optionalText = z.string().min(1).optional();
const optionalUrl = z.url().optional();
const boolFlag = z.stringbool().default(false);

export const envSchema = z
  .object({
    APP_ENV: z.enum(APP_ENV_NAMES).default('dev'),
    AUTH_PROVIDER: z.enum(AUTH_PROVIDERS).default('mock'),
    SUPABASE_URL: optionalUrl,
    SUPABASE_ANON_KEY: optionalText,
    MAPS_PROVIDER: z.enum(MAPS_PROVIDERS).default('yandex'),
    YANDEX_MAPS_KEY: optionalText,
    GOOGLE_MAPS_KEY: optionalText,
    SENTRY_ENABLED: boolFlag,
    SENTRY_DSN: optionalUrl,
    ANALYTICS_ENABLED: boolFlag,
    POSTHOG_KEY: optionalText,
    POSTHOG_HOST: optionalUrl,
  })
  .refine((value) => value.AUTH_PROVIDER !== 'supabase' || value.SUPABASE_URL !== undefined, {
    message: 'required when EXPO_PUBLIC_AUTH_PROVIDER=supabase',
    path: ['SUPABASE_URL'],
  })
  .refine((value) => value.AUTH_PROVIDER !== 'supabase' || value.SUPABASE_ANON_KEY !== undefined, {
    message: 'required when EXPO_PUBLIC_AUTH_PROVIDER=supabase',
    path: ['SUPABASE_ANON_KEY'],
  });

export type AppEnv = z.infer<typeof envSchema>;
export type RawEnv = Record<keyof z.input<typeof envSchema>, string | undefined>;

const ENV_PREFIX = 'EXPO_PUBLIC_';

/** Thrown when the configuration is invalid; `keys` lists the offending variable names. */
export class EnvValidationError extends Error {
  readonly keys: readonly string[];

  constructor(keys: readonly string[], details: string) {
    super(`Invalid ${ENV_PREFIX}* configuration: ${details}`);
    this.name = 'EnvValidationError';
    this.keys = keys;
  }
}

/** Empty strings (as produced by blank lines in `.env`) count as "not set". */
function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Reads every variable as a literal member expression (`process.env.EXPO_PUBLIC_X`): Expo only
 * inlines public variables when they are accessed exactly this way, never through dynamic keys.
 */
export function readRawEnv(): RawEnv {
  return {
    APP_ENV: clean(process.env.EXPO_PUBLIC_APP_ENV),
    AUTH_PROVIDER: clean(process.env.EXPO_PUBLIC_AUTH_PROVIDER),
    SUPABASE_URL: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
    SUPABASE_ANON_KEY: clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    MAPS_PROVIDER: clean(process.env.EXPO_PUBLIC_MAPS_PROVIDER),
    YANDEX_MAPS_KEY: clean(process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY),
    GOOGLE_MAPS_KEY: clean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY),
    SENTRY_ENABLED: clean(process.env.EXPO_PUBLIC_SENTRY_ENABLED),
    SENTRY_DSN: clean(process.env.EXPO_PUBLIC_SENTRY_DSN),
    ANALYTICS_ENABLED: clean(process.env.EXPO_PUBLIC_ANALYTICS_ENABLED),
    POSTHOG_KEY: clean(process.env.EXPO_PUBLIC_POSTHOG_KEY),
    POSTHOG_HOST: clean(process.env.EXPO_PUBLIC_POSTHOG_HOST),
  };
}

/** Validates a raw environment; throws `EnvValidationError` naming every bad variable. */
export function parseEnv(raw: RawEnv): AppEnv {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;

  const messagesByKey = new Map<string, string[]>();
  for (const issue of result.error.issues) {
    const key = `${ENV_PREFIX}${String(issue.path[0] ?? 'UNKNOWN')}`;
    const messages = messagesByKey.get(key) ?? [];
    messages.push(issue.message);
    messagesByKey.set(key, messages);
  }
  const details = [...messagesByKey]
    .map(([key, messages]) => `${key} (${messages.join('; ')})`)
    .join(', ');
  throw new EnvValidationError([...messagesByKey.keys()], details);
}

export const env: AppEnv = parseEnv(readRawEnv());

export const isDev = env.APP_ENV === 'dev';
export const isProduction = env.APP_ENV === 'production';
