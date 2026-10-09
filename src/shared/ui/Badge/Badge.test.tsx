import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, spacing, typography } from '@/shared/theme/tokens';

import { Badge, badgeText } from './Badge';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('badgeText', () => {
  it('prefers count over label and caps at max+', () => {
    expect(badgeText('New', undefined, 99)).toBe('New');
    expect(badgeText('New', 5, 99)).toBe('5');
    expect(badgeText(undefined, 120, 99)).toBe('99+');
    expect(badgeText(undefined, 0, 99)).toBe('0');
    expect(badgeText(undefined, undefined, 99)).toBe('');
  });
});

describe('Badge', () => {
  it('renders a label with dark tone colors and a text role', async () => {
    await renderDark(<Badge tone="success" label="Active" testID="b" />);
    const badge = screen.getByTestId('b');
    expect(badge).toHaveStyle({ backgroundColor: darkColors.successBg });
    expect(badge.props.accessibilityRole).toBe('text');
    expect(badge).toHaveAccessibleName('Active');
    expect(screen.getByText('Active')).toHaveStyle({ color: darkColors.onSuccessBg });
  });

  it('renders every tone from the theme in light mode', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Badge tone="warning" label="w" testID="warning" />
        <Badge tone="error" label="e" testID="error" />
        <Badge tone="info" label="i" testID="info" />
        <Badge tone="neutral" label="n" testID="neutral" />
        <Badge tone="primary" label="p" testID="primary" />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('warning')).toHaveStyle({ backgroundColor: lightColors.warningBg });
    expect(screen.getByTestId('error')).toHaveStyle({ backgroundColor: lightColors.errorBg });
    expect(screen.getByTestId('info')).toHaveStyle({ backgroundColor: lightColors.infoBg });
    expect(screen.getByTestId('neutral')).toHaveStyle({ backgroundColor: lightColors.secondary });
    expect(screen.getByTestId('primary')).toHaveStyle({ backgroundColor: lightColors.primary });
    expect(screen.getByText('p')).toHaveStyle({ color: lightColors.onPrimary });
  });

  it('formats counts, caps at max and sizes sm / md', async () => {
    await renderDark(
      <>
        <Badge count={7} size="sm" testID="sm" />
        <Badge count={250} max={99} testID="md" />
      </>,
    );
    expect(screen.getByText('7')).toHaveStyle({ fontSize: typography.overline.fontSize });
    expect(screen.getByText('99+')).toHaveStyle({ fontSize: typography.caption.fontSize });
    expect(screen.getByTestId('sm')).toHaveStyle({ height: spacing[5] });
    expect(screen.getByTestId('md')).toHaveStyle({ height: spacing[6] });
  });

  it('renders a dot hidden from a11y unless labelled', async () => {
    await renderDark(
      <>
        <Badge dot tone="error" testID="silent" />
        <Badge dot tone="info" accessibilityLabel="Unread" testID="spoken" />
      </>,
    );
    const silent = screen.getByTestId('silent');
    expect(silent).toHaveStyle({ width: spacing[3], backgroundColor: darkColors.error });
    expect(silent.props.accessible).toBe(false);
    expect(silent.props.importantForAccessibility).toBe('no');
    expect(screen.queryByText('')).toBeNull();
    const spoken = screen.getByTestId('spoken');
    expect(spoken.props.accessible).toBe(true);
    expect(spoken).toHaveAccessibleName('Unread');
  });
});
