import { fireEvent, render, screen } from '@testing-library/react-native';
import { Heart } from 'lucide-react-native';

import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, MIN_TOUCH, radii, spacing } from '@/shared/theme/tokens';

import { IconButton } from './IconButton';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined) },
}));

const label = 'Add to favourites';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

type HostNode = ReturnType<typeof screen.getByTestId>;

/** lucide passes `color` to the SVG tree as `stroke`; find it on the first host that has it. */
function findStroke(node: HostNode | string): unknown {
  if (typeof node === 'string') return undefined;
  if (node.props.stroke !== undefined) return node.props.stroke;
  for (const child of node.children) {
    const found = findStroke(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe('IconButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is a 44pt circular button named by its label that fires onPress with a haptic', async () => {
    const onPress = jest.fn();
    await renderDark(<IconButton icon={Heart} accessibilityLabel={label} onPress={onPress} />);
    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveStyle({ width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radii.full });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
  });

  it('can switch the haptic off and grows to 56pt for lg', async () => {
    await renderDark(
      <IconButton icon={Heart} accessibilityLabel={label} size="lg" hapticsEnabled={false} />,
    );
    const button = screen.getByRole('button');
    await fireEvent.press(button);
    expect(haptics.selection).not.toHaveBeenCalled();
    expect(button).toHaveStyle({ width: spacing[12] + spacing[2] });
  });

  it('applies dark variant colors', async () => {
    await renderDark(
      <>
        <IconButton icon={Heart} accessibilityLabel={label} testID="ghost" />
        <IconButton icon={Heart} accessibilityLabel={label} variant="filled" testID="filled" />
        <IconButton icon={Heart} accessibilityLabel={label} variant="primary" testID="primary" />
        <IconButton icon={Heart} accessibilityLabel={label} variant="outline" testID="outline" />
      </>,
    );
    expect(screen.getByTestId('ghost')).toHaveStyle({ backgroundColor: 'transparent' });
    expect(screen.getByTestId('filled')).toHaveStyle({ backgroundColor: darkColors.secondary });
    expect(screen.getByTestId('primary')).toHaveStyle({ backgroundColor: darkColors.primary });
    expect(screen.getByTestId('outline')).toHaveStyle({ borderColor: darkColors.borderStrong });
  });

  it('colors the icon from the theme and honours iconColor in light mode', async () => {
    await render(
      <ThemeProvider scheme="light">
        <IconButton icon={Heart} accessibilityLabel={label} iconColor="error" testID="b" />
      </ThemeProvider>,
    );
    expect(findStroke(screen.getByTestId('b'))).toBe(lightColors.error);
  });

  it('colors the icon with the variant foreground by default', async () => {
    await renderDark(
      <IconButton icon={Heart} accessibilityLabel={label} variant="primary" testID="b" />,
    );
    expect(findStroke(screen.getByTestId('b'))).toBe(darkColors.onPrimary);
  });

  it('blocks presses when disabled', async () => {
    const onPress = jest.fn();
    await renderDark(
      <IconButton icon={Heart} accessibilityLabel={label} onPress={onPress} disabled />,
    );
    const button = screen.getByRole('button');
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});
