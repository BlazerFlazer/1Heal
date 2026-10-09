import {
  isPartnerMode,
  resolveEntryHref,
  resolveShellGuards,
  SHELL_ENTRY,
  type ShellState,
} from './routeGuards';

const base: ShellState = {
  status: 'signedIn',
  activeMode: 'member',
  isPartner: false,
  onboardingCompleted: true,
};

describe('resolveShellGuards', () => {
  it('opens only the public group before onboarding is completed', () => {
    expect(
      resolveShellGuards({ ...base, status: 'signedOut', onboardingCompleted: false }),
    ).toEqual({ public: true, member: false, partner: false });
  });

  it('keeps the public group open while signed out', () => {
    expect(resolveShellGuards({ ...base, status: 'signedOut' })).toEqual({
      public: true,
      member: false,
      partner: false,
    });
  });

  it('opens the member group for a signed-in member', () => {
    expect(resolveShellGuards(base)).toEqual({ public: false, member: true, partner: false });
  });

  it('opens the partner group only with the role and the partner mode', () => {
    expect(resolveShellGuards({ ...base, activeMode: 'partner', isPartner: true })).toEqual({
      public: false,
      member: false,
      partner: true,
    });
  });

  it('falls back to the member group when partner mode is set without the role', () => {
    expect(resolveShellGuards({ ...base, activeMode: 'partner', isPartner: false })).toEqual({
      public: false,
      member: true,
      partner: false,
    });
  });

  it('closes every group while bootstrapping', () => {
    expect(resolveShellGuards({ ...base, status: 'bootstrapping' })).toEqual({
      public: false,
      member: false,
      partner: false,
    });
  });
});

describe('resolveEntryHref', () => {
  it('sends new users to onboarding first', () => {
    expect(resolveEntryHref({ ...base, status: 'signedOut', onboardingCompleted: false })).toBe(
      SHELL_ENTRY.onboarding,
    );
  });

  it('sends signed-out users to sign-in', () => {
    expect(resolveEntryHref({ ...base, status: 'signedOut' })).toBe(SHELL_ENTRY.signIn);
  });

  it('sends members to the member tabs and partners to the scanner', () => {
    expect(resolveEntryHref(base)).toBe(SHELL_ENTRY.member);
    expect(resolveEntryHref({ ...base, activeMode: 'partner', isPartner: true })).toBe(
      SHELL_ENTRY.partner,
    );
  });

  it('never routes a role-less user into partner mode', () => {
    const state: ShellState = { ...base, activeMode: 'partner', isPartner: false };
    expect(isPartnerMode(state)).toBe(false);
    expect(resolveEntryHref(state)).toBe(SHELL_ENTRY.member);
  });
});
