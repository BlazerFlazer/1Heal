import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, typography } from '@/shared/theme/tokens';

import { MAX_FONT_SIZE_MULTIPLIER, Text } from './Text';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const label = 'Tashkent';

function flat(testId: string) {
  return StyleSheet.flatten(screen.getByTestId(testId).props.style);
}

describe('Text', () => {
  it('renders body / textPrimary by default with dynamic type capped', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text testID="t">{label}</Text>
      </ThemeProvider>,
    );
    const node = screen.getByTestId('t');
    expect(screen.getByText(label)).toBeTruthy();
    expect(flat('t')).toMatchObject({ ...typography.body, color: lightColors.textPrimary });
    expect(node.props.allowFontScaling).toBe(true);
    expect(node.props.maxFontSizeMultiplier).toBe(MAX_FONT_SIZE_MULTIPLIER);
  });

  it('applies variant, color and align', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text testID="t" variant="title" color="textSecondary" align="center">
          {label}
        </Text>
      </ThemeProvider>,
    );
    expect(flat('t')).toMatchObject({
      ...typography.title,
      color: lightColors.textSecondary,
      textAlign: 'center',
    });
  });

  it('follows the dark theme', async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Text testID="t" color="onPrimary">
          {label}
        </Text>
      </ThemeProvider>,
    );
    expect(flat('t').color).toBe(darkColors.onPrimary);
  });

  it('passes RN Text props through and lets style override tokens', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Text
          testID="t"
          variant="overline"
          selectable
          numberOfLines={2}
          accessibilityRole="header"
          maxFontSizeMultiplier={1.2}
          style={{ lineHeight: 20 }}
        >
          {label}
        </Text>
      </ThemeProvider>,
    );
    const node = screen.getByTestId('t');
    expect(node.props.selectable).toBe(true);
    expect(node.props.numberOfLines).toBe(2);
    expect(node.props.accessibilityRole).toBe('header');
    expect(node.props.maxFontSizeMultiplier).toBe(1.2);
    expect(flat('t')).toMatchObject({
      letterSpacing: typography.overline.letterSpacing,
      lineHeight: 20,
    });
  });
});
