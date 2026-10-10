import { getDefaultFlags, LocalFlagProvider, useFeatureFlags } from '@/shared/config/featureFlags';

import { createFakeFlagsClient } from './__fixtures__/fakeFlagsClient';
import { getFlagProvider, SupabaseFlagProvider } from './featureFlagProvider';

jest.mock('./supabaseClient', () => ({
  isSupabaseConfigured: jest.fn(() => false),
  getSupabaseClient: jest.fn(() => ({})),
}));

const clientModule = jest.requireMock<{
  isSupabaseConfigured: jest.Mock<boolean, []>;
  getSupabaseClient: jest.Mock;
}>('./supabaseClient');

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('SupabaseFlagProvider', () => {
  beforeEach(() => {
    useFeatureFlags.getState().reset();
  });

  it('loads the remote flags into the store', async () => {
    const fake = createFakeFlagsClient();
    const unsubscribe = await useFeatureFlags
      .getState()
      .load(new SupabaseFlagProvider(fake.client));
    const { flags, status } = useFeatureFlags.getState();
    expect(status).toBe('ready');
    expect(flags).toMatchObject({ 'payments.payme': false, newUserPromo: false, waitlist: true });
    unsubscribe();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('falls back to the defaults when the fetch fails', async () => {
    const fake = createFakeFlagsClient({ data: null, error: { message: 'offline' } });
    await useFeatureFlags.getState().load(new SupabaseFlagProvider(fake.client));
    expect(useFeatureFlags.getState().status).toBe('error');
    expect(useFeatureFlags.getState().flags).toEqual(getDefaultFlags());
  });

  it('refetches on a live change and keeps the last flags when the refetch fails', async () => {
    const fake = createFakeFlagsClient();
    const unsubscribe = await useFeatureFlags
      .getState()
      .load(new SupabaseFlagProvider(fake.client));

    fake.setResult({
      data: [{ key: 'waitlist', enabled: false, payload: { app_key: 'waitlist' } }],
      error: null,
    });
    fake.emitChange();
    await flushPromises();
    expect(useFeatureFlags.getState().flags.waitlist).toBe(false);

    fake.setResult({ data: null, error: { message: 'network' } });
    fake.emitChange();
    await flushPromises();
    expect(useFeatureFlags.getState().flags.waitlist).toBe(false);
    expect(useFeatureFlags.getState().status).toBe('ready');

    unsubscribe();
    fake.setResult({
      data: [{ key: 'waitlist', enabled: true, payload: { app_key: 'waitlist' } }],
      error: null,
    });
    fake.emitChange();
    await flushPromises();
    expect(useFeatureFlags.getState().flags.waitlist).toBe(false);
  });

  it('ignores a refetch that resolves after unsubscribing', async () => {
    const fake = createFakeFlagsClient();
    const provider = new SupabaseFlagProvider(fake.client);
    const callback = jest.fn();
    const unsubscribe = provider.subscribe(callback);
    fake.emitChange();
    unsubscribe();
    await flushPromises();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('getFlagProvider', () => {
  it('uses the local defaults unless Supabase is configured', () => {
    clientModule.isSupabaseConfigured.mockReturnValue(false);
    expect(getFlagProvider()).toBeInstanceOf(LocalFlagProvider);
    expect(clientModule.getSupabaseClient).not.toHaveBeenCalled();
  });

  it('uses Supabase when the auth provider is supabase with URL and key', () => {
    clientModule.isSupabaseConfigured.mockReturnValue(true);
    expect(getFlagProvider()).toBeInstanceOf(SupabaseFlagProvider);
    expect(clientModule.getSupabaseClient).toHaveBeenCalledTimes(1);
  });
});
