import { render, renderHook, screen } from '@testing-library/react-native';
import { Text as RNText, View } from 'react-native';

import {
  getTheme,
  resolveScheme,
  ThemeProvider,
  useTheme,
  useThemedStyles,
  type Theme,
} from './ThemeProvider';
import { useThemeStore } from './themeStore';
import { darkColors, lightColors } from './tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function SchemeProbe() {
  const theme = useTheme();
  return <RNText testID="scheme">{theme.scheme}</RNText>;
}

const cardStyles = (theme: Theme) => ({
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing[4] },
});

function StyledProbe() {
  const styles = useThemedStyles(cardStyles);
  return <View testID="card" style={styles.card} />;
}

describe('resolveScheme', () => {
  it('follows the system when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });

  it('lets an explicit preference win over the system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: 'system' });
  });

  it('resolves dark when the preference is dark', async () => {
    useThemeStore.setState({ preference: 'dark' });
    await render(
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
  });

  it('resolves light when the preference is light', async () => {
    useThemeStore.setState({ preference: 'light' });
    await render(
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('scheme')).toHaveTextContent('light');
  });

  it('honours a forced scheme prop', async () => {
    useThemeStore.setState({ preference: 'light' });
    await render(
      <ThemeProvider scheme="dark">
        <SchemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
  });

  it('exposes colors, tokens and elevation for the resolved scheme', async () => {
    useThemeStore.setState({ preference: 'dark' });
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toBe(darkColors);
    expect(result.current.spacing[4]).toBe(16);
    expect(result.current.elevation(2)).toMatchObject({ shadowColor: darkColors.shadow });
    expect(result.current).toBe(getTheme('dark'));
  });

  it('falls back to the light theme outside a provider', async () => {
    const { result } = await renderHook(() => useTheme());
    expect(result.current.scheme).toBe('light');
    expect(result.current.colors).toBe(lightColors);
  });

  it('useThemedStyles builds styles from the current theme', async () => {
    useThemeStore.setState({ preference: 'dark' });
    await render(
      <ThemeProvider>
        <StyledProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: darkColors.surface,
      padding: 16,
    });
  });
});
