import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';

import { elevationFor } from '@/shared/theme/elevation';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, radii, spacing } from '@/shared/theme/tokens';

import { Card } from './Card';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const content = 'Venue';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Card', () => {
  it('renders a static elevated surface with dark tokens by default', async () => {
    await renderDark(
      <Card testID="c">
        <RNText>{content}</RNText>
      </Card>,
    );
    const card = screen.getByTestId('c');
    expect(screen.getByText(content)).toBeOnTheScreen();
    expect(card).toHaveStyle({
      backgroundColor: darkColors.surfaceElevated,
      borderColor: darkColors.border,
      borderRadius: radii.md,
      padding: spacing[4],
      ...elevationFor(darkColors, 1),
    });
    expect(card.props.accessibilityRole).toBeUndefined();
    expect(card.props.onPress).toBeUndefined();
  });

  it('applies radius, elevation and padding props in light mode', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Card testID="c" radius="lg" elevation={3} padding={6} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('c')).toHaveStyle({
      backgroundColor: lightColors.surfaceElevated,
      borderRadius: radii.lg,
      padding: spacing[6],
      ...elevationFor(lightColors, 3),
    });
  });

  it('becomes an accessible button with onPress', async () => {
    const onPress = jest.fn();
    await renderDark(
      <Card onPress={onPress} accessibilityLabel={content} testID="c">
        <RNText>{content}</RNText>
      </Card>,
    );
    const card = screen.getByRole('button', { name: content });
    expect(card).toHaveStyle({ backgroundColor: darkColors.surfaceElevated });
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('respects disabled when pressable', async () => {
    const onPress = jest.fn();
    await renderDark(<Card onPress={onPress} disabled testID="c" />);
    await fireEvent.press(screen.getByTestId('c'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('c')).toBeDisabled();
  });
});
