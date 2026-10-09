import * as SecureStore from 'expo-secure-store';

import type { KeyValueBackend } from './jsonStorage';

/** iOS keychain / Android Keystore values are limited to 2048 bytes; larger values are chunked. */
export const SECURE_STORE_MAX_VALUE_BYTES = 2048;

/** Readable after the first unlock so background refreshes can run while the phone is locked. */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export const secureStoreBackend: KeyValueBackend = {
  getItem: (key) => SecureStore.getItemAsync(key, OPTIONS),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, OPTIONS),
  removeItem: (key) => SecureStore.deleteItemAsync(key, OPTIONS),
};
