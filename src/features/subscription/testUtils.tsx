import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { useAuthStore } from '@/services/auth/authStore';
import type { Session } from '@/services/auth/types';
import { EMPTY_MEMBERSHIP, useMembershipStore } from '@/services/membership/membershipStore';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';

export const MEMBER_ID = 'member-1';

const session: Session = {
  userId: MEMBER_ID,
  phoneE164: '+998901234567',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '2030-01-01T00:00:00.000Z',
  roles: ['member'],
  deviceId: 'device-1',
  profile: { fullName: 'Aziza Karimova' },
};

/** Signs a member in with an empty membership ledger. */
export function signInMember(): void {
  useAuthStore.setState({ status: 'signedIn', session, activeMode: 'member' });
  useMembershipStore.setState({ byUser: { [MEMBER_ID]: EMPTY_MEMBERSHIP } });
}

/** Renders a screen inside the theme and a fresh, retry-free query client. */
export function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}
