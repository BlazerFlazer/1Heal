import type { Href } from 'expo-router';

import type { ActiveMode, AuthStatus } from '@/services/auth/authStore';

/** Everything the root navigator needs to decide which route group is reachable. */
export type ShellState = {
  status: AuthStatus;
  activeMode: ActiveMode;
  /** Whether the current session carries the `partner` role. */
  isPartner: boolean;
  onboardingCompleted: boolean;
};

/** One `Stack.Protected` guard per route group. */
export type ShellGuards = {
  public: boolean;
  member: boolean;
  partner: boolean;
};

/** Entry points of each route group; the root `index` redirects to one of them. */
export const SHELL_ENTRY = {
  onboarding: '/(public)/onboarding',
  signIn: '/(public)/sign-in',
  member: '/(member)/(tabs)',
  partner: '/(partner)/(tabs)/scan',
} as const satisfies Record<string, Href>;

/** Partner mode is only real when the session actually holds the partner role. */
export function isPartnerMode(state: ShellState): boolean {
  return state.status === 'signedIn' && state.activeMode === 'partner' && state.isPartner;
}

/**
 * Public screens stay reachable until onboarding is done and the user is signed in.
 * A signed-in user lands in exactly one of the member or partner groups; member is the
 * default so a stale "partner" preference without the role can never lock the user out.
 */
export function resolveShellGuards(state: ShellState): ShellGuards {
  const signedIn = state.status === 'signedIn';
  const partner = isPartnerMode(state);
  return {
    public: !state.onboardingCompleted || state.status === 'signedOut',
    member: signedIn && !partner,
    partner,
  };
}

/** Where the root `index` route sends the user; mirrors `resolveShellGuards`. */
export function resolveEntryHref(state: ShellState): Href {
  if (!state.onboardingCompleted) return SHELL_ENTRY.onboarding;
  if (state.status !== 'signedIn') return SHELL_ENTRY.signIn;
  return isPartnerMode(state) ? SHELL_ENTRY.partner : SHELL_ENTRY.member;
}
