import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { BookingsScreen } from './BookingsScreen';

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

const useNetworkState = jest.mocked(Network.useNetworkState);
const OFFLINE = 'No connection. Showing saved data.';

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

function tree(scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <BookingsScreen />
    </ThemeProvider>
  );
}

describe('BookingsScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    setOnline(true);
  });

  it('starts on the upcoming tab with a call to action towards the catalogue', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'My bookings' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Upcoming', selected: true })).toBeOnTheScreen();
    expect(screen.getByText('No bookings yet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Find a venue' }));
    expect(router.push).toHaveBeenCalledWith('/(member)/(tabs)/discover');
  });

  it('switches to the past tab', async () => {
    await render(tree());
    await fireEvent.press(screen.getByRole('tab', { name: 'Past' }));
    expect(screen.getByRole('tab', { name: 'Past', selected: true })).toBeOnTheScreen();
    expect(screen.getByText('No history yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Find a venue' })).toBeNull();
  });

  it('shows the offline banner only while offline', async () => {
    await render(tree());
    expect(screen.queryByText(OFFLINE)).toBeNull();

    setOnline(false);
    await screen.rerender(tree());
    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
  });

  it.each<ColorScheme>(['light', 'dark'])('paints the %s background', async (scheme) => {
    await render(tree(scheme));
    expect(StyleSheet.flatten(screen.getByTestId('bookings').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
  });
});
