import { useEffect } from 'react';

import { getFlagProvider } from '@/services/api/featureFlagProvider';
import type { AuthStatus } from '@/services/auth/authStore';
import { type FeatureFlagProvider, useFeatureFlags } from '@/shared/config/featureFlags';

/**
 * Loads the remote feature flags once a session exists (`feature_flags` is readable by
 * authenticated users only) and follows live updates until sign-out or unmount. Until then, and
 * whenever the fetch fails, the local defaults stay in effect.
 */
export function useFeatureFlagSync(
  status: AuthStatus,
  createProvider: () => FeatureFlagProvider = getFlagProvider,
): void {
  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    let active = true;
    let stop: (() => void) | undefined;
    void useFeatureFlags
      .getState()
      .load(createProvider())
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else unsubscribe();
      });
    return () => {
      active = false;
      stop?.();
    };
  }, [status, createProvider]);
}
