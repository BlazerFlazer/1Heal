import { useSyncExternalStore } from 'react';

import { useMembershipStore } from '@/services/membership/membershipStore';

/** True once the persisted membership ledger has been read from device storage. */
export function useMembershipHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useMembershipStore.persist.onFinishHydration(onChange),
    () => useMembershipStore.persist.hasHydrated(),
  );
}
