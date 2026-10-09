import {
  type FeatureFlagProvider,
  type Flags,
  getDefaultFlags,
  isEnabled,
  LocalFlagProvider,
  useFeatureFlags,
} from './featureFlags';

describe('featureFlags', () => {
  beforeEach(() => {
    useFeatureFlags.getState().reset();
  });

  it('exposes local defaults per environment', () => {
    expect(getDefaultFlags('dev')['payments.payme']).toBe(true);
    expect(getDefaultFlags('staging')['payments.click']).toBe(true);
    expect(getDefaultFlags('production')['payments.uzum']).toBe(false);
    expect(getDefaultFlags('production').partnerMode).toBe(true);
    expect(getDefaultFlags('production')['maps.provider']).toBe('yandex');
  });

  it('starts with the defaults of the current env', () => {
    const state = useFeatureFlags.getState();
    expect(state.status).toBe('defaults');
    expect(state.flags).toEqual(getDefaultFlags());
    expect(isEnabled('waitlist')).toBe(true);
  });

  it('merges remote flags over defaults and keeps the rest', () => {
    const applied = useFeatureFlags
      .getState()
      .applyRemote({ waitlist: false, 'maps.provider': 'google' });
    expect(applied).toBe(true);
    const { flags, status } = useFeatureFlags.getState();
    expect(status).toBe('ready');
    expect(flags.waitlist).toBe(false);
    expect(flags['maps.provider']).toBe('google');
    expect(flags.freeze).toBe(getDefaultFlags().freeze);
    expect(isEnabled('waitlist')).toBe(false);
  });

  it('ignores invalid remote payloads', () => {
    const before = useFeatureFlags.getState().flags;
    expect(useFeatureFlags.getState().applyRemote({ waitlist: 'nope' })).toBe(false);
    expect(useFeatureFlags.getState().applyRemote('garbage')).toBe(false);
    expect(useFeatureFlags.getState().flags).toEqual(before);
  });

  it('drops unknown keys from remote payloads', () => {
    expect(useFeatureFlags.getState().applyRemote({ freeze: false, unknownFlag: true })).toBe(true);
    expect(useFeatureFlags.getState().remote).toEqual({ freeze: false });
  });

  it('loads from a LocalFlagProvider', async () => {
    const unsubscribe = await useFeatureFlags
      .getState()
      .load(new LocalFlagProvider({ newUserPromo: false }));
    expect(useFeatureFlags.getState().status).toBe('ready');
    expect(isEnabled('newUserPromo')).toBe(false);
    expect(typeof unsubscribe).toBe('function');
  });

  it('follows live updates from a subscribing provider and can stop', async () => {
    let push: ((flags: Partial<Flags>) => void) | undefined;
    const stop = jest.fn();
    const provider: FeatureFlagProvider = {
      getFlags: () => Promise.resolve({}),
      subscribe: (callback) => {
        push = callback;
        return stop;
      },
    };
    const unsubscribe = await useFeatureFlags.getState().load(provider);
    push?.({ freeze: false });
    expect(isEnabled('freeze')).toBe(false);
    unsubscribe();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('keeps defaults and reports an error when the provider fails', async () => {
    const provider: FeatureFlagProvider = {
      getFlags: () => Promise.reject(new Error('offline')),
    };
    await useFeatureFlags.getState().load(provider);
    expect(useFeatureFlags.getState().status).toBe('error');
    expect(useFeatureFlags.getState().flags).toEqual(getDefaultFlags());
  });

  it('resets to defaults', () => {
    useFeatureFlags.getState().applyRemote({ waitlist: false });
    useFeatureFlags.getState().reset();
    expect(useFeatureFlags.getState()).toMatchObject({
      status: 'defaults',
      remote: {},
      flags: getDefaultFlags(),
    });
  });
});
