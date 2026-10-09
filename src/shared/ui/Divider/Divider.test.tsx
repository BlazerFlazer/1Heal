import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, spacing } from '@/shared/theme/tokens';

import { Divider } from './Divider';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Divider', () => {
  it('renders a horizontal hairline in the dark border color, hidden from a11y', async () => {
    useThemeStore.setState({ preference: 'dark' });
    await render(
      <ThemeProvider>
        <Divider testID="d" />
      </ThemeProvider>,
    );
    const divider = screen.getByTestId('d');
    expect(divider).toHaveStyle({
      height: StyleSheet.hairlineWidth,
      backgroundColor: darkColors.border,
      marginHorizontal: 0,
    });
    expect(divider.props.accessible).toBe(false);
    expect(divider.props.importantForAccessibility).toBe('no');
    expect(divider.props.role).toBe('separator');
  });

  it('supports vertical orientation, inset and a custom color role in light mode', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Divider testID="d" orientation="vertical" inset={4} color="borderStrong" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('d')).toHaveStyle({
      width: StyleSheet.hairlineWidth,
      marginVertical: spacing[4],
      backgroundColor: lightColors.borderStrong,
    });
  });
});
