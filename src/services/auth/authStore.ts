import { useEffect } from 'react';
import { z } from 'zod';
import { create } from 'zustand';

import { appStorage } from '@/services/storage/appStorage';
import { APP_KEYS } from '@/services/storage/storageKeys';

import type { AuthService } from './AuthService';
import { getAuthService } from './index';
import { hasRole, type Role, type Session } from './types';

export const ACTIVE_MODES = ['member', 'partner'] as const;
export const activeModeSchema = z.enum(ACTIVE_MODES);
export type ActiveMode = z.infer<typeof activeModeSchema>;

export type AuthStatus = 'bootstrapping' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** Which half of the app is shown; partner mode needs the partner role. */
  activeMode: ActiveMode;
  setSession(session: Session | null): void;
  clear(): void;
  setActiveMode(mode: ActiveMode): void;
}

/** Best effort: the mode is already applied in memory, a storage failure must not undo it. */
function persistActiveMode(mode: ActiveMode): void {
  appStorage.setJson(APP_KEYS.activeMode, mode).catch(() => undefined);
}

function resolveMode(requested: ActiveMode, session: Session | null): ActiveMode {
  return requested === 'partner' && hasRole(session, 'partner') ? 'partner' : 'member';
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'bootstrapping',
  session: null,
  activeMode: 'member',

  setSession: (session) => {
    const activeMode = resolveMode(get().activeMode, session);
    if (activeMode !== get().activeMode) persistActiveMode(activeMode);
    set({ session, status: session ? 'signedIn' : 'signedOut', activeMode });
  },

  clear: () => {
    set({ session: null, status: 'signedOut', activeMode: 'member' });
    appStorage.remove(APP_KEYS.activeMode).catch(() => undefined);
  },

  setActiveMode: (mode) => {
    const activeMode = resolveMode(mode, get().session);
    set({ activeMode });
    persistActiveMode(activeMode);
  },
}));

export const selectHasRole =
  (role: Role) =>
  (state: Pick<AuthState, 'session'>): boolean =>
    hasRole(state.session, role);

export const selectIsSignedIn = (state: Pick<AuthState, 'status'>): boolean =>
  state.status === 'signedIn';

export function useHasRole(role: Role): boolean {
  return useAuthStore(selectHasRole(role));
}

/**
 * Mount once in the root layout. Restores the persisted session and the last active mode,
 * then follows the service's auth events until unmount. Returns the current status.
 */
export function useAuthBootstrap(service: AuthService = getAuthService()): AuthStatus {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    let active = true;
    const { setSession, setActiveMode } = useAuthStore.getState();
    const unsubscribe = service.onAuthStateChange((session) => {
      if (active) setSession(session);
    });

    void Promise.all([
      service.restoreSession().catch(() => null),
      appStorage.getJson(APP_KEYS.activeMode, activeModeSchema).catch(() => null),
    ]).then(([session, storedMode]) => {
      if (!active) return;
      setSession(session);
      if (storedMode !== null) setActiveMode(storedMode);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);

  return status;
}
