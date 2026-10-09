import type { ZodType } from 'zod';

import { createJsonStorage, type JsonStorage } from './jsonStorage';
import { SECURE_STORE_MAX_VALUE_BYTES, secureStoreBackend } from './secureStoreBackend';

/**
 * Typed secure storage for tokens and other secrets. Backed by expo-secure-store on native
 * (`secureStoreBackend.ts`) and by localStorage on web (`secureStoreBackend.web.ts`, dev preview).
 * Values above the 2 KB keychain limit are transparently chunked.
 */
export const secureStorage: JsonStorage = createJsonStorage(secureStoreBackend, {
  maxValueBytes: SECURE_STORE_MAX_VALUE_BYTES,
});

export function getJson<T>(key: string, schema: ZodType<T>): Promise<T | null> {
  return secureStorage.getJson(key, schema);
}

export function setJson<T>(key: string, value: T): Promise<void> {
  return secureStorage.setJson(key, value);
}

export function remove(key: string): Promise<void> {
  return secureStorage.remove(key);
}
