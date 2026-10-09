import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { APP_KEYS } from '@/services/storage/storageKeys';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type StoreModule = typeof import('./onboardingStore');

function loadStore(): StoreModule['useOnboardingStore'] {
  let loaded: StoreModule | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual<StoreModule>('./onboardingStore');
  });
  if (!loaded) throw new Error('store did not load');
  return loaded.useOnboardingStore;
}

describe('useOnboardingStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts not completed and reports hydration', async () => {
    const store = loadStore();
    expect(store.getState().completed).toBe(false);
    await waitFor(() => expect(store.getState().hydrated).toBe(true));
    expect(store.getState().completed).toBe(false);
  });

  it('persists completion and restores it on the next launch', async () => {
    const first = loadStore();
    await waitFor(() => expect(first.getState().hydrated).toBe(true));
    first.getState().complete();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(APP_KEYS.onboarding)).toContain('"completed":true'),
    );

    const second = loadStore();
    await waitFor(() => expect(second.getState().hydrated).toBe(true));
    expect(second.getState().completed).toBe(true);

    second.getState().reset();
    expect(second.getState().completed).toBe(false);
  });

  it('ignores corrupt persisted state', async () => {
    await AsyncStorage.setItem(
      APP_KEYS.onboarding,
      JSON.stringify({ state: { completed: 'yes' }, version: 0 }),
    );
    const store = loadStore();
    await waitFor(() => expect(store.getState().hydrated).toBe(true));
    expect(store.getState().completed).toBe(false);
  });
});
