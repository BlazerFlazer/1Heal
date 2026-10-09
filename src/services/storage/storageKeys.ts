/**
 * Every persisted key lives here so collisions are impossible and migrations are greppable.
 * expo-secure-store allows only `[A-Za-z0-9._-]`; chunk suffixes (`.chunkN`) are appended by
 * `jsonStorage`.
 */

/** Secrets and tokens: expo-secure-store on native, localStorage on web (dev preview only). */
export const SECURE_KEYS = {
  authSession: 'oneheal.auth.session',
  deviceId: 'oneheal.device.id',
  qrTokenWindow: 'oneheal.qr.tokens',
} as const;

/** Non-sensitive app state: AsyncStorage on every platform. */
export const APP_KEYS = {
  activeMode: 'oneheal.auth.activeMode',
  onboarding: 'oneheal.onboarding',
  queryCache: 'oneheal.query.cache',
} as const;

export type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];
export type AppKey = (typeof APP_KEYS)[keyof typeof APP_KEYS];
