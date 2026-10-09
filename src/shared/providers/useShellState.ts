import { useAuthStore, useHasRole } from '@/services/auth/authStore';
import { useOnboardingStore } from '@/services/session/onboardingStore';

import type { ShellState } from './routeGuards';

/** Reactive snapshot of the stores that drive the root navigator's guards. */
export function useShellState(): ShellState {
  const status = useAuthStore((state) => state.status);
  const activeMode = useAuthStore((state) => state.activeMode);
  const isPartner = useHasRole('partner');
  const onboardingCompleted = useOnboardingStore((state) => state.completed);
  return { status, activeMode, isPartner, onboardingCompleted };
}
