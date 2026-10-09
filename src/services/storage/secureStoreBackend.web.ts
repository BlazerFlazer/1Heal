import { createMemoryBackend, type KeyValueBackend } from './jsonStorage';

/**
 * Web is a developer preview only (ADR-007): secrets go to `localStorage`, which is not secure.
 * The chunk size matches native so the on-disk layout and the tests are identical.
 */
export const SECURE_STORE_MAX_VALUE_BYTES = 2048;

const PREFIX = 'secure:';

function resolveLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access can throw in sandboxed iframes or when site data is blocked.
    return null;
  }
}

export function createLocalStorageBackend(storage: Storage): KeyValueBackend {
  return {
    getItem: (key) => Promise.resolve(storage.getItem(PREFIX + key)),
    setItem: (key, value) => {
      storage.setItem(PREFIX + key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      storage.removeItem(PREFIX + key);
      return Promise.resolve();
    },
  };
}

const localStorageRef = resolveLocalStorage();

export const secureStoreBackend: KeyValueBackend = localStorageRef
  ? createLocalStorageBackend(localStorageRef)
  : createMemoryBackend();
