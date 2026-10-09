import { env, isDev, type AuthProviderName } from '@/shared/config/env';

export type DevHintConfig = { isDev: boolean; authProvider: AuthProviderName };

const APP_CONFIG: DevHintConfig = { isDev, authProvider: env.AUTH_PROVIDER };

/** The mock code is surfaced only in dev builds that talk to the mock provider, never elsewhere. */
export function shouldShowDevCodeHint(config: DevHintConfig = APP_CONFIG): boolean {
  return config.isDev && config.authProvider === 'mock';
}
