import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { QR_FRAME_BORDER_WIDTH, QrScreen } from './QrScreen';

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
const OFFLINE_NOTE = 'The QR code works offline too: a few codes are saved in advance.';

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

function tree(scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <QrScreen />
    </ThemeProvider>
  );
}

describe('QrScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    setOnline(true);
  });

  it('shows the placeholder frame and explains how to get a QR code', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'My QR code' })).toBeOnTheScreen();
    const frame = screen.getByLabelText('QR code placeholder');
    expect(StyleSheet.flatten(frame.props.style).borderWidth).toBe(QR_FRAME_BORDER_WIDTH);
    expect(
      screen.getByText('Your QR code appears once a subscription is active'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Choose a plan' }));
    expect(router.push).toHaveBeenCalledWith('/(member)/subscription/plans');
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

  it.each<ColorScheme>(['light', 'dark'])(
    'uses the %s surface and background tokens',
    async (scheme) => {
      await render(tree(scheme));
      expect(StyleSheet.flatten(screen.getByTestId('qr').props.style).backgroundColor).toBe(
        themeColors[scheme].background,
      );
      expect(StyleSheet.flatten(screen.getByTestId('qr-card').props.style).backgroundColor).toBe(
        themeColors[scheme].surfaceElevated,
      );
    },
  );
});
