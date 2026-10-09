import { z } from 'zod';

import { createJsonStorage } from './jsonStorage';
import {
  createLocalStorageBackend,
  SECURE_STORE_MAX_VALUE_BYTES,
  secureStoreBackend,
} from './secureStoreBackend.web';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe('secureStoreBackend (web)', () => {
  it('prefixes keys in localStorage', async () => {
    const storage = fakeStorage();
    const backend = createLocalStorageBackend(storage);
    await backend.setItem('oneheal.token', 'abc');
    expect(storage.getItem('secure:oneheal.token')).toBe('abc');
    await expect(backend.getItem('oneheal.token')).resolves.toBe('abc');
    await backend.removeItem('oneheal.token');
    await expect(backend.getItem('oneheal.token')).resolves.toBeNull();
  });

  it('works end to end with the JSON layer and chunking', async () => {
    const storage = createJsonStorage(createLocalStorageBackend(fakeStorage()), {
      maxValueBytes: SECURE_STORE_MAX_VALUE_BYTES,
    });
    const value = { token: 'z'.repeat(3000) };
    await storage.setJson('oneheal.big', value);
    await expect(storage.getJson('oneheal.big', z.object({ token: z.string() }))).resolves.toEqual(
      value,
    );
  });

  it('falls back to a working backend when localStorage is unavailable', async () => {
    await secureStoreBackend.setItem('k', 'v');
    await expect(secureStoreBackend.getItem('k')).resolves.toBe('v');
    await secureStoreBackend.removeItem('k');
    await expect(secureStoreBackend.getItem('k')).resolves.toBeNull();
  });
});
