import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet, Text as RNText } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, spacing, type ColorScheme } from '@/shared/theme/tokens';

import { Screen, type ScreenProps } from './Screen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
};
const CHILD = 'child';
const HEADER = 'header';

function renderScreen(props: Partial<ScreenProps> = {}, scheme: ColorScheme = 'light') {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider scheme={scheme}>
        <Screen testID="screen" {...props}>
          <RNText>{CHILD}</RNText>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

describe('Screen', () => {
  it('renders children, pads the safe area and uses the background token', async () => {
    await renderScreen();
    expect(screen.getByText(CHILD)).toBeOnTheScreen();
    expect(flat('screen')).toMatchObject({
      flex: 1,
      backgroundColor: lightColors.background,
      paddingTop: 47,
    });
    expect(flat('screen-content')).toMatchObject({
      padding: spacing[4],
      paddingBottom: spacing[4] + 34,
    });
  });

  it('follows the dark theme and the surface background role', async () => {
    await renderScreen({ background: 'surface' }, 'dark');
    expect(flat('screen').backgroundColor).toBe(darkColors.surface);
  });

  it('respects edges and padding props', async () => {
    await renderScreen({ edges: [], padding: 0 });
    expect(flat('screen').paddingTop).toBe(0);
    expect(flat('screen-content')).toMatchObject({ padding: 0, paddingBottom: 0 });
  });

  it('renders the header slot above the content', async () => {
    await renderScreen({ header: <RNText>{HEADER}</RNText> });
    expect(screen.getByText(HEADER)).toBeOnTheScreen();
    expect(screen.getByText(CHILD)).toBeOnTheScreen();
  });

  it('scrolls when asked, keeping taps on inputs and the safe-area bottom padding', async () => {
    await renderScreen({ scroll: true });
    const scrollView = screen.getByTestId('screen-content');
    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.keyboardDismissMode).toBe('on-drag');
    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toMatchObject({
      flexGrow: 1,
      paddingBottom: spacing[4] + 34,
    });
  });

  it('only avoids the keyboard on iOS', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      await renderScreen({ scroll: true });
      expect(screen.getByText(CHILD)).toBeOnTheScreen();
    } finally {
      restore.restore();
    }
  });
});
