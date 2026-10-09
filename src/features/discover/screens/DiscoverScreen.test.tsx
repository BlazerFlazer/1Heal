import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { SEARCH_DEBOUNCE_MS } from '../useDebouncedValue';
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
      <DiscoverScreen />
    </ThemeProvider>
  );
}

const settleDebounce = () =>
  act(async () => {
    jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
  });

describe('DiscoverScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    setOnline(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders the title, the search field, the view toggle and the catalogue placeholder', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'Discover' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Search venues')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'List', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Map', selected: false })).toBeOnTheScreen();
    expect(screen.getByText('Venues are coming soon')).toBeOnTheScreen();
  });

  it('debounces the search text and shows the no-results state for it', async () => {
    await render(tree());
    await fireEvent.changeText(screen.getByTestId('discover-search-field'), 'yoga');
    expect(screen.queryByText('Nothing found')).toBeNull();

    await settleDebounce();
    expect(screen.getByText('Nothing found')).toBeOnTheScreen();
    expect(screen.getByText('Nothing matches “yoga” yet. Try another word.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
    await settleDebounce();
    expect(screen.getByText('Venues are coming soon')).toBeOnTheScreen();
  });

  it('switches to the map placeholder', async () => {
    await render(tree());
    await fireEvent.press(screen.getByRole('tab', { name: 'Map' }));
    expect(screen.getByRole('tab', { name: 'Map', selected: true })).toBeOnTheScreen();
    expect(screen.getByText('Map is coming soon')).toBeOnTheScreen();
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
    expect(StyleSheet.flatten(screen.getByTestId('discover').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
  });
});
