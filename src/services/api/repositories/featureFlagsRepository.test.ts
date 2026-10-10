import {
  FEATURE_FLAG_COLUMNS,
  FEATURE_FLAGS_CHANNEL,
  FeatureFlagsFetchError,
  fetchFeatureFlagRows,
  flagsFromRows,
  subscribeToFeatureFlagChanges,
} from './featureFlagsRepository';
import { createFakeFlagsClient, SEED_FLAG_ROWS } from '../__fixtures__/fakeFlagsClient';

describe('flagsFromRows', () => {
  it('maps the seeded rows onto the app flag keys', () => {
    expect(flagsFromRows(SEED_FLAG_ROWS)).toEqual({
      'payments.payme': false,
      'payments.click': false,
      'payments.uzum': false,
      partnerMode: true,
      waitlist: true,
      freeze: true,
      newUserPromo: false,
      'maps.provider': 'yandex',
    });
  });

  it('takes `enabled` for boolean flags, even when payload.value disagrees', () => {
    expect(
      flagsFromRows([
        { key: 'waitlist', enabled: false, payload: { app_key: 'waitlist', value: true } },
        { key: 'freeze', enabled: true, payload: { app_key: 'freeze' } },
      ]),
    ).toEqual({ waitlist: false, freeze: true });
  });

  it('applies non-boolean values only while the row is enabled', () => {
    const row = { key: 'maps_provider', payload: { app_key: 'maps.provider', value: 'google' } };
    expect(flagsFromRows([{ ...row, enabled: true }])).toEqual({ 'maps.provider': 'google' });
    expect(flagsFromRows([{ ...row, enabled: false }])).toEqual({});
  });

  it('skips malformed rows, unknown app keys and invalid values one by one', () => {
    expect(
      flagsFromRows([
        null,
        { key: 'x', enabled: 'yes', payload: { app_key: 'waitlist' } },
        { key: 'x', enabled: true, payload: [] },
        { key: 'x', enabled: true, payload: { app_key: 'toString' } },
        { key: 'x', enabled: true, payload: { app_key: 'unknownFlag', value: true } },
        { key: 'x', enabled: true, payload: { app_key: 'maps.provider', value: 'osm' } },
        { key: 'partner_mode', enabled: false, payload: { app_key: 'partnerMode' } },
      ]),
    ).toEqual({ partnerMode: false });
  });
});

describe('fetchFeatureFlagRows', () => {
  it('selects explicit columns from feature_flags', async () => {
    const fake = createFakeFlagsClient();
    await expect(fetchFeatureFlagRows(fake.client)).resolves.toEqual(SEED_FLAG_ROWS);
    expect(fake.from).toHaveBeenCalledWith('feature_flags');
    expect(fake.select).toHaveBeenCalledWith(FEATURE_FLAG_COLUMNS);
  });

  it('treats a null result as no rows', async () => {
    const fake = createFakeFlagsClient({ data: null, error: null });
    await expect(fetchFeatureFlagRows(fake.client)).resolves.toEqual([]);
  });

  it('throws FeatureFlagsFetchError with the PostgREST code', async () => {
    const fake = createFakeFlagsClient({
      data: null,
      error: { message: 'permission denied for table feature_flags', code: '42501' },
    });
    const error: unknown = await fetchFeatureFlagRows(fake.client).catch((caught) => caught);
    expect(error).toBeInstanceOf(FeatureFlagsFetchError);
    expect(error).toMatchObject({ code: '42501' });
  });
});

describe('subscribeToFeatureFlagChanges', () => {
  it('listens to every change of public.feature_flags until unsubscribed', () => {
    const fake = createFakeFlagsClient();
    const onChange = jest.fn();
    const unsubscribe = subscribeToFeatureFlagChanges(fake.client, onChange);

    expect(fake.channel).toHaveBeenCalledWith(FEATURE_FLAGS_CHANNEL);
    expect(fake.channelObject.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'feature_flags' },
      expect.any(Function),
    );
    fake.emitStatus('SUBSCRIBED');
    fake.emitChange();
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    unsubscribe();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
    fake.emitChange();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT'] as const)(
    'removes the channel when Realtime reports %s',
    (status) => {
      const fake = createFakeFlagsClient();
      const unsubscribe = subscribeToFeatureFlagChanges(fake.client, jest.fn());
      fake.emitStatus(status);
      expect(fake.removeChannel).toHaveBeenCalledTimes(1);
      unsubscribe();
      expect(fake.removeChannel).toHaveBeenCalledTimes(1);
    },
  );
});
