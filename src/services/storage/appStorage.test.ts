import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { appStorage, getJson, remove, setJson } from './appStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const schema = z.object({ completed: z.boolean() });

describe('appStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('stores JSON in AsyncStorage without chunking', async () => {
    await setJson('oneheal.onboarding', { completed: true });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'oneheal.onboarding',
      JSON.stringify({ completed: true }),
    );
    await expect(getJson('oneheal.onboarding', schema)).resolves.toEqual({ completed: true });
  });

  it('keeps large values in a single entry', async () => {
    const value = { completed: true, note: 'n'.repeat(10_000) };
    await appStorage.setJson('oneheal.big', value);
    expect(await AsyncStorage.getAllKeys()).toEqual(['oneheal.big']);
  });

  it('validates on read and removes bad data', async () => {
    await AsyncStorage.setItem('oneheal.onboarding', JSON.stringify({ completed: 'yes' }));
    await expect(getJson('oneheal.onboarding', schema)).resolves.toBeNull();
    expect(await AsyncStorage.getItem('oneheal.onboarding')).toBeNull();
  });

  it('removes keys', async () => {
    await setJson('oneheal.onboarding', { completed: false });
    await remove('oneheal.onboarding');
    await expect(getJson('oneheal.onboarding', schema)).resolves.toBeNull();
  });
});
