/**
 * Picks the SMS provider from the environment: SMS_PROVIDER=mock (default, dev) | eskiz.
 * Eskiz needs ESKIZ_EMAIL and ESKIZ_PASSWORD; ESKIZ_FROM, ESKIZ_BASE_URL and ESKIZ_CALLBACK_URL
 * are optional. See supabase/functions/README.md.
 */
import type { Logger } from '../log';
import { EskizSmsProvider } from './EskizSmsProvider';
import { MockSmsProvider } from './MockSmsProvider';
import type { SmsProvider } from './SmsProvider';

export type { SmsProvider, SmsPurpose, SmsSendInput, SmsSendResult } from './SmsProvider';
export { SmsError, isSmsError } from './SmsProvider';
export { EskizSmsProvider } from './EskizSmsProvider';
export { MockSmsProvider } from './MockSmsProvider';

export const SMS_PROVIDER_NAMES = ['mock', 'eskiz'] as const;
export type SmsProviderName = (typeof SMS_PROVIDER_NAMES)[number];

export type SmsEnv = Readonly<Record<string, string | undefined>>;

export interface CreateSmsProviderDeps {
  log?: Logger;
  fetch?: typeof fetch;
  now?: () => number;
}

export function createSmsProvider(env: SmsEnv, deps: CreateSmsProviderDeps = {}): SmsProvider {
  const name = (env.SMS_PROVIDER ?? 'mock').trim().toLowerCase();
  if (name === 'mock') return new MockSmsProvider({ log: deps.log });
  if (name === 'eskiz') {
    return new EskizSmsProvider(
      {
        email: required(env, 'ESKIZ_EMAIL'),
        password: required(env, 'ESKIZ_PASSWORD'),
        from: env.ESKIZ_FROM,
        baseUrl: env.ESKIZ_BASE_URL,
        callbackUrl: env.ESKIZ_CALLBACK_URL,
      },
      { fetch: deps.fetch, now: deps.now },
    );
  }
  throw new Error(`SMS_PROVIDER must be one of ${SMS_PROVIDER_NAMES.join(', ')}, got "${name}"`);
}

function required(env: SmsEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required when SMS_PROVIDER=eskiz`);
  return value;
}
