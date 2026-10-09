import { act, render, screen } from '@testing-library/react-native';

import { NBSP } from '@/shared/i18n/chars';
import { i18n } from '@/shared/i18n/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, typography } from '@/shared/theme/tokens';

import { PriceTag } from './PriceTag';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const ru = `250${NBSP}000${NBSP}сум`;
const uz = `250${NBSP}000${NBSP}so'm`;
const en = `250${NBSP}000${NBSP}UZS`;
const period = 'per month';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('PriceTag', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru');
  });

  it('formats integer UZS for the active locale with the title variant in dark mode', async () => {
    await renderDark(<PriceTag amountUzs={250000} period={period} testID="p" />);
    const price = screen.getByText(ru);
    expect(price).toHaveStyle({
      color: darkColors.textPrimary,
      fontSize: typography.title.fontSize,
    });
    expect(screen.getByText(period)).toHaveStyle({ color: darkColors.textSecondary });
    expect(screen.getByTestId('p')).toHaveAccessibleName(`${ru} ${period}`);
  });

  it('re-renders when the language changes', async () => {
    await renderDark(<PriceTag amountUzs={250000} />);
    await act(async () => {
      await i18n.changeLanguage('uz');
    });
    expect(screen.getByText(uz)).toBeOnTheScreen();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(screen.getByText(en)).toBeOnTheScreen();
  });

  it('strikes through the old price and honours sizes and a custom label', async () => {
    await render(
      <ThemeProvider scheme="light">
        <PriceTag amountUzs={250000} oldAmountUzs={300000} size="lg" testID="lg" />
        <PriceTag amountUzs={250000} size="sm" accessibilityLabel="custom" testID="sm" />
      </ThemeProvider>,
    );
    const old = screen.getByText(`300${NBSP}000${NBSP}сум`);
    expect(old).toHaveStyle({
      textDecorationLine: 'line-through',
      color: lightColors.textSecondary,
    });
    const prices = screen.getAllByText(ru);
    expect(prices[0]).toHaveStyle({ fontSize: typography.display.fontSize });
    expect(prices[1]).toHaveStyle({ fontSize: typography.bodyStrong.fontSize });
    expect(screen.getByTestId('sm')).toHaveAccessibleName('custom');
    expect(screen.getByTestId('lg')).toHaveAccessibleName(ru);
  });
});
