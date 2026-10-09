import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { StyleSheet } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { getAnimatedStyle } from 'react-native-reanimated';

import { i18n } from '@/shared/i18n';
import { durations } from '@/shared/theme/motion';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, type ColorScheme } from '@/shared/theme/tokens';

import { OfflineBanner } from './OfflineBanner';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const useNetworkState = jest.mocked(Network.useNetworkState);
const useReducedMotion = jest.mocked(Reanimated.useReducedMotion);
const BANNER_HEIGHT = 36;

function setOnline(isOnline: boolean | null) {
  useNetworkState.mockReturnValue(
    isOnline === null ? {} : { isConnected: isOnline, isInternetReachable: isOnline },
  );
}

function renderBanner(scheme: ColorScheme = 'light') {
  return render(
    <ThemeProvider scheme={scheme}>
      <OfflineBanner testID="banner" />
    </ThemeProvider>,
  );
}

function rerenderBanner() {
  return screen.rerender(
    <ThemeProvider scheme="light">
      <OfflineBanner testID="banner" />
    </ThemeProvider>,
  );
}

async function measure() {
  await fireEvent(screen.getByTestId('banner-content', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: BANNER_HEIGHT } },
  });
}

const settle = () =>
  act(async () => {
    jest.advanceTimersByTime(durations.base + 50);
  });

describe('OfflineBanner', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    useReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays collapsed and hidden from assistive tech while online or unknown', async () => {
    setOnline(true);
    await renderBanner();
    await measure();
    await settle();
    const banner = screen.getByTestId('banner', { includeHiddenElements: true });
    expect(getAnimatedStyle(banner).height).toBe(0);
    expect(banner.props['aria-hidden']).toBe(true);

    setOnline(null);
    await rerenderBanner();
    await settle();
    expect(getAnimatedStyle(banner).height).toBe(0);
  });

  it('grows to the content height when offline and collapses when back online', async () => {
    setOnline(false);
    await renderBanner();
    await measure();
    await settle();
    const banner = screen.getByTestId('banner');
    expect(getAnimatedStyle(banner).height).toBe(BANNER_HEIGHT);
    expect(banner.props['aria-hidden']).toBe(false);
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('No connection. Showing saved data.')).toBeOnTheScreen();

    setOnline(true);
    await rerenderBanner();
    await settle();
    expect(getAnimatedStyle(banner).height).toBe(0);
  });

  it('jumps straight to the final height under reduce motion', async () => {
    useReducedMotion.mockReturnValue(true);
    setOnline(false);
    await renderBanner();
    await measure();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(getAnimatedStyle(screen.getByTestId('banner')).height).toBe(BANNER_HEIGHT);
  });

  it.each<[ColorScheme, string]>([
    ['light', lightColors.warningBg],
    ['dark', darkColors.warningBg],
  ])('uses the %s warning tokens', async (scheme, color) => {
    setOnline(false);
    await renderBanner(scheme);
    expect(
      StyleSheet.flatten(screen.getByTestId('banner-content').props.style).backgroundColor,
    ).toBe(color);
  });
});
