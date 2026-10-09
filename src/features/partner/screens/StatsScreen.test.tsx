import { render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { StyleSheet } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { themeColors, type ColorScheme } from '@/shared/theme/tokens';

import { STAT_PLACEHOLDER, StatsScreen } from './StatsScreen';

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

const useNetworkState = jest.mocked(Network.useNetworkState);
const OFFLINE = 'No connection. Showing saved data.';

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

function tree(scheme: ColorScheme = 'light') {
  return (
    <ThemeProvider scheme={scheme}>
      <StatsScreen />
    </ThemeProvider>
  );
}

describe('StatsScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    setOnline(true);
  });

  it('renders three placeholder stat cards with labels and captions', async () => {
    await render(tree());
    expect(screen.getByRole('header', { name: 'Stats' })).toBeOnTheScreen();
    for (const key of ['visits', 'noShows', 'payout']) {
      expect(screen.getByTestId(`stats-${key}-value`)).toHaveTextContent(STAT_PLACEHOLDER);
    }
    expect(screen.getByText('Visits today')).toBeOnTheScreen();
    expect(screen.getByText('No-shows this week')).toBeOnTheScreen();
    expect(screen.getByText('Expected payout')).toBeOnTheScreen();
    expect(screen.getByText('For the current month, in UZS')).toBeOnTheScreen();
  });

  it('shows the offline banner only while offline', async () => {
    await render(tree());
    expect(screen.queryByText(OFFLINE)).toBeNull();

    setOnline(false);
    await screen.rerender(tree());
    expect(screen.getByText(OFFLINE)).toBeOnTheScreen();
  });

  it.each<ColorScheme>(['light', 'dark'])('uses the %s card surface', async (scheme) => {
    await render(tree(scheme));
    expect(StyleSheet.flatten(screen.getByTestId('stats').props.style).backgroundColor).toBe(
      themeColors[scheme].background,
    );
    expect(StyleSheet.flatten(screen.getByTestId('stats-visits').props.style).backgroundColor).toBe(
      themeColors[scheme].surfaceElevated,
    );
  });
});
