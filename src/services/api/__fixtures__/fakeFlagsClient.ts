import type { FeatureFlagsClient } from '../repositories/featureFlagsRepository';

/** The nine rows `supabase/seed.sql` inserts into `public.feature_flags`. */
export const SEED_FLAG_ROWS = [
  { key: 'payments_payme', enabled: false, payload: { app_key: 'payments.payme', value: false } },
  { key: 'payments_click', enabled: false, payload: { app_key: 'payments.click', value: false } },
  { key: 'payments_uzum', enabled: false, payload: { app_key: 'payments.uzum', value: false } },
  { key: 'partner_mode', enabled: true, payload: { app_key: 'partnerMode', value: true } },
  { key: 'waitlist', enabled: true, payload: { app_key: 'waitlist', value: true } },
  {
    key: 'freeze',
    enabled: true,
    payload: { app_key: 'freeze', value: true, max_days: 30, per_quarter: 1 },
  },
  { key: 'new_user_promo', enabled: false, payload: { app_key: 'newUserPromo', value: false } },
  { key: 'maps_provider', enabled: true, payload: { app_key: 'maps.provider', value: 'yandex' } },
  {
    key: 'no_show_penalty',
    enabled: true,
    payload: { threshold: 3, window_days: 30, block_days: 7 },
  },
];

type SelectResult = { data: unknown[] | null; error: { message: string; code?: string } | null };
type SubscribeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

interface FakeChannel {
  on: jest.Mock<FakeChannel, [string, Record<string, string>, () => void]>;
  subscribe: jest.Mock<FakeChannel, [(status: SubscribeStatus) => void]>;
}

/** A Supabase client fake covering `from().select()` and one Realtime channel. */
export function createFakeFlagsClient(
  initial: SelectResult = { data: SEED_FLAG_ROWS, error: null },
) {
  let result: SelectResult = initial;
  let changeHandler: (() => void) | undefined;
  let statusHandler: ((status: SubscribeStatus) => void) | undefined;

  const select = jest.fn((_columns: string) => Promise.resolve(result));
  const from = jest.fn((_table: string) => ({ select }));
  const channelObject: FakeChannel = {
    on: jest.fn((_type: string, _filter: Record<string, string>, handler: () => void) => {
      changeHandler = handler;
      return channelObject;
    }),
    subscribe: jest.fn((handler: (status: SubscribeStatus) => void) => {
      statusHandler = handler;
      return channelObject;
    }),
  };
  const channel = jest.fn((_name: string) => channelObject);
  const removeChannel = jest.fn((_channel: unknown) => Promise.resolve('ok'));

  return {
    client: { from, channel, removeChannel } as unknown as FeatureFlagsClient,
    from,
    select,
    channel,
    channelObject,
    removeChannel,
    setResult: (next: SelectResult) => {
      result = next;
    },
    emitChange: () => changeHandler?.(),
    emitStatus: (status: SubscribeStatus) => statusHandler?.(status),
  };
}
