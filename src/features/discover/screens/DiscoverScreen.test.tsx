import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import type { ReactElement } from 'react';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { ToastProvider } from '@/shared/ui/Toast';

import { DiscoverScreen } from './DiscoverScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual('react-native').FlatList,
}));
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
);
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    medium: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
    warning: jest.fn(async () => undefined),
    error: jest.fn(async () => undefined),
  },
}));
jest.mock('@/services/auth', () => ({ getAuthService: jest.fn() }));

function withProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider scheme="light">
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('DiscoverScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest
      .mocked(Network.useNetworkState)
      .mockReturnValue({ isConnected: true, isInternetReachable: true });
  });

  it('shows skeletons, then the venue list with a count, and opens a venue', async () => {
    await render(withProviders(<DiscoverScreen />));
    expect(screen.getByRole('header', { name: 'Discover' })).toBeOnTheScreen();
    expect(screen.getByTestId('discover-skeleton')).toBeOnTheScreen();

    expect(await screen.findByText('30 venues')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'All' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open now' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('discover-venue-pulse-fitness-yunusabad'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/venue/[id]',
      params: { id: 'aebd4df0-457a-56c4-ba15-e4dfb1231ab4' },
    });
  });

  it('preselects the route category and resets filters from the empty state', async () => {
    await render(withProviders(<DiscoverScreen category="pool" />));
    expect(await screen.findByRole('button', { name: 'Pools', selected: true })).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('discover-search-field'), 'zzzz-no-such-venue');
    expect(await screen.findByText('Nothing found')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByText('30 venues')).toBeOnTheScreen();
  });
});
