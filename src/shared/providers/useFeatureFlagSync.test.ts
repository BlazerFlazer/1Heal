import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { AuthStatus } from '@/services/auth/authStore';
import { type FeatureFlagProvider, useFeatureFlags } from '@/shared/config/featureFlags';

import { useFeatureFlagSync } from './useFeatureFlagSync';

jest.mock('@/services/api/featureFlagProvider', () => ({
  getFlagProvider: jest.fn(),
}));

function fakeProvider() {
  const unsubscribe = jest.fn();
  const provider: FeatureFlagProvider = {
    getFlags: jest.fn(() => Promise.resolve({ waitlist: false })),
    subscribe: jest.fn(() => unsubscribe),
  };
  return { provider, unsubscribe, create: jest.fn(() => provider) };
}

describe('useFeatureFlagSync', () => {
  beforeEach(() => {
    useFeatureFlags.getState().reset();
  });

  it('does nothing until a session exists', async () => {
    const { create } = fakeProvider();
    await renderHook(() => useFeatureFlagSync('signedOut', create));
    await renderHook(() => useFeatureFlagSync('bootstrapping', create));
    expect(create).not.toHaveBeenCalled();
    expect(useFeatureFlags.getState().status).toBe('defaults');
  });

  it('loads after sign-in and stops following on sign-out', async () => {
    const { create, provider, unsubscribe } = fakeProvider();
    const { rerender } = await renderHook(
      ({ status }: { status: AuthStatus }) => useFeatureFlagSync(status, create),
      { initialProps: { status: 'signedIn' } },
    );
    await waitFor(() => expect(provider.subscribe).toHaveBeenCalled());
    expect(useFeatureFlags.getState().flags.waitlist).toBe(false);

    await act(async () => {
      await rerender({ status: 'signedOut' });
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on unmount', async () => {
    const { create, provider, unsubscribe } = fakeProvider();
    const { unmount } = await renderHook(() => useFeatureFlagSync('signedIn', create));
    await act(async () => {
      await unmount();
    });
    await waitFor(() => expect(provider.subscribe).toHaveBeenCalled());
    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });
});
