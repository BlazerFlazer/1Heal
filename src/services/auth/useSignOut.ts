import { useState } from 'react';

import { useAuthStore } from './authStore';
import { getAuthService } from './index';

export type SignOut = { busy: boolean; signOut: () => Promise<void> };

/**
 * Ends the current session from any mode. A failed remote sign-out still clears the local
 * session: leaving is the user's intent, and the server-side token expires on its own.
 * Clearing the store closes the member/partner guard, so the caller is unmounted by the router.
 */
export function useSignOut(): SignOut {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await getAuthService().signOut();
    } catch (error) {
      console.warn('[auth] remote sign-out failed, clearing the local session', error);
    } finally {
      useAuthStore.getState().clear();
      setBusy(false);
    }
  };

  return { busy, signOut };
}
