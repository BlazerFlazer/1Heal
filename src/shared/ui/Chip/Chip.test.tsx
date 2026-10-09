import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dumbbell } from 'lucide-react-native';

import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, spacing } from '@/shared/theme/tokens';

import { Chip } from './Chip';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined) },
}));

const label = 'Gym';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Chip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is an unselected button by default and toggles via onPress with a haptic', async () => {
    const onPress = jest.fn();
    await renderDark(<Chip label={label} onPress={onPress} testID="c" />);
    const chip = screen.getByRole('button', { name: label });
    expect(chip).not.toBeSelected();
    expect(chip).toHaveStyle({
      backgroundColor: darkColors.surfaceElevated,
      borderColor: darkColors.border,
      height: spacing[10],
    });
    expect(chip.props.hitSlop).toEqual({ top: 2, bottom: 2 });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
  });

  it('exposes and styles the selected state', async () => {
    await renderDark(<Chip label={label} selected testID="c" />);
    const chip = screen.getByTestId('c');
    expect(chip).toBeSelected();
    expect(chip).toHaveStyle({
      backgroundColor: darkColors.primarySubtle,
      borderColor: darkColors.primary,
    });
    expect(screen.getByText(label)).toHaveStyle({ color: darkColors.onPrimarySubtle });
  });

  it('renders a small chip with a leading icon in light mode and pads the hit area', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Chip label={label} size="sm" leftIcon={Dumbbell} testID="c" />
      </ThemeProvider>,
    );
    const chip = screen.getByTestId('c');
    expect(chip).toHaveStyle({ height: spacing[8], backgroundColor: lightColors.surfaceElevated });
    expect(chip.props.hitSlop).toEqual({ top: 6, bottom: 6 });
    expect(chip.children).toHaveLength(2);
  });

  it('blocks presses when disabled', async () => {
    const onPress = jest.fn();
    await renderDark(<Chip label={label} onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
