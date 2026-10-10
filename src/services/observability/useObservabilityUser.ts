import { useEffect } from 'react';

import { useAuthStore } from '@/services/auth/authStore';

import { setObservabilityUser } from './sentry';

/** Keeps the Sentry user (internal id only) and the `app_mode` tag in sync with the session. */
export function useObservabilityUser(): void {
  const userId = useAuthStore((state) => state.session?.userId ?? null);
  const mode = useAuthStore((state) => state.activeMode);

  useEffect(() => {
    setObservabilityUser(userId, mode);
  }, [userId, mode]);
}
