import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import { getJson, remove, secureStorage, setJson } from './secureStorage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      if (value.length > 2048) {
        return Promise.reject(new Error('value too large'));
      }
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __store: store,
  };
});

const mocked = SecureStore as unknown as typeof SecureStore & { __store: Map<string, string> };
const sessionSchema = z.object({ token: z.string() });

describe('secureStorage (native)', () => {
  beforeEach(() => {
    mocked.__store.clear();
    jest.clearAllMocks();
  });

  it('writes and reads through expo-secure-store with keychain options', async () => {
    await setJson('oneheal.test', { token: 'abc' });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'oneheal.test',
      JSON.stringify({ token: 'abc' }),
      expect.objectContaining({ keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
    );
    await expect(getJson('oneheal.test', sessionSchema)).resolves.toEqual({ token: 'abc' });
  });

  it('chunks values above the 2 KB keychain limit', async () => {
    const value = { token: 'x'.repeat(5000) };
    await setJson('oneheal.big', value);
    expect(mocked.__store.size).toBeGreaterThan(1);
    await expect(secureStorage.getJson('oneheal.big', sessionSchema)).resolves.toEqual(value);
  });

  it('remove() clears the key and its chunks', async () => {
    await setJson('oneheal.big', { token: 'y'.repeat(5000) });
    await remove('oneheal.big');
    expect(mocked.__store.size).toBe(0);
    await expect(getJson('oneheal.big', sessionSchema)).resolves.toBeNull();
  });
});
