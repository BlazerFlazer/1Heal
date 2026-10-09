import { render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { SCAN_FRAME_BORDER_WIDTH, ScanScreen } from './ScanScreen';

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
const OFFLINE_NOTE = 'Checking a QR code needs an internet connection.';

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

function tree(scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <ScanScreen />
    </ThemeProvider>
  );
}

describe('ScanScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    setOnline(true);
  });

  it('shows the frame, a disabled start button and the helper text', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'Scanner' })).toBeOnTheScreen();
    const frame = screen.getByLabelText('Scanning area');
    expect(StyleSheet.flatten(frame.props.style).borderWidth).toBe(SCAN_FRAME_BORDER_WIDTH);
    expect(
      screen.getByRole('button', { name: 'Start scanning', disabled: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'QR scanning arrives with the check-in update. We will ask for camera access then.',
      ),
    ).toBeOnTheScreen();
  });

  it('shows the banner and the offline note only while offline', async () => {
    await render(tree());
    expect(screen.queryByText(OFFLINE)).toBeNull();
    expect(screen.queryByText(OFFLINE_NOTE)).toBeNull();

    setOnline(false);
    await screen.rerender(tree());
    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
    expect(screen.getByText(OFFLINE_NOTE)).toBeOnTheScreen();
  });

  it.each<ColorScheme>(['light', 'dark'])('paints the %s background', async (scheme) => {
    await render(tree(scheme));
    expect(StyleSheet.flatten(screen.getByTestId('scan').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
  });
});
