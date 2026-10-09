import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ZodType } from 'zod';

import { createJsonStorage, type JsonStorage, type KeyValueBackend } from './jsonStorage';

/** Typed, zod-validated JSON over AsyncStorage for non-sensitive app state. */
export const asyncStorageBackend: KeyValueBackend = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export const appStorage: JsonStorage = createJsonStorage(asyncStorageBackend);

export function getJson<T>(key: string, schema: ZodType<T>): Promise<T | null> {
  return appStorage.getJson(key, schema);
}

export function setJson<T>(key: string, value: T): Promise<void> {
  return appStorage.setJson(key, value);
}

export function remove(key: string): Promise<void> {
  return appStorage.remove(key);
}
