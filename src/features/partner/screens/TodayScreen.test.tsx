import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { TodayScreen } from './TodayScreen';

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
      <TodayScreen />
    </ThemeProvider>
  );
}

describe('TodayScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    setOnline(true);
  });

  it('starts on bookings and switches to the waitlist', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Bookings', selected: true })).toBeOnTheScreen();
    expect(screen.getByText('No bookings for today')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Waitlist' }));
    expect(screen.getByText('Waitlist is empty')).toBeOnTheScreen();
    expect(screen.queryByText('No bookings for today')).toBeNull();
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
    expect(StyleSheet.flatten(screen.getByTestId('today').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
  });
});
