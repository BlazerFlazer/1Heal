import { fireEvent, render, screen } from '@testing-library/react-native';
import { ArrowRight, Check } from 'lucide-react-native';

import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, spacing } from '@/shared/theme/tokens';

import { Button } from './Button';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
  },
}));

const label = 'Continue';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function surfaceOf(testID: string) {
  return screen.getByTestId(testID).children[0];
}

describe('Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label as an accessible button and fires onPress with a light haptic', async () => {
    const onPress = jest.fn();
    await renderDark(<Button label={label} onPress={onPress} />);
    const button = screen.getByRole('button', { name: label });
    expect(screen.getByText(label)).toBeOnTheScreen();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });

  it('maps the haptic prop and allows none', async () => {
    await renderDark(
      <>
        <Button label={label} haptic="success" testID="s" />
        <Button label={label} haptic="none" testID="n" />
      </>,
    );
    await fireEvent.press(screen.getByTestId('s'));
    expect(haptics.success).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('n'));
    expect(haptics.light).not.toHaveBeenCalled();
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });

  it('ignores presses and exposes the disabled state when disabled', async () => {
    const onPress = jest.fn();
    await renderDark(<Button label={label} onPress={onPress} disabled testID="b" />);
    await fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b')).toBeDisabled();
  });

  it('shows a spinner, hides the label without unmounting it and blocks presses while loading', async () => {
    const onPress = jest.fn();
    await renderDark(<Button label={label} onPress={onPress} loading testID="b" />);
    const button = screen.getByTestId('b');
    expect(button).toBeBusy();
    expect(screen.getByTestId('b-spinner', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText(label).parent).toHaveStyle({ opacity: 0 });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders no spinner when idle', async () => {
    await renderDark(<Button label={label} testID="b" />);
    expect(screen.queryByTestId('b-spinner', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('b')).not.toBeBusy();
  });

  it('uses dark primary tokens by default and themed variant colors', async () => {
    await renderDark(
      <>
        <Button label={label} testID="primary" />
        <Button label={label} variant="secondary" testID="secondary" />
        <Button label={label} variant="outline" testID="outline" />
        <Button label={label} variant="ghost" testID="ghost" />
        <Button label={label} variant="destructive" testID="destructive" />
      </>,
    );
    expect(surfaceOf('primary')).toHaveStyle({ backgroundColor: darkColors.primary });
    expect(surfaceOf('secondary')).toHaveStyle({ backgroundColor: darkColors.secondary });
    expect(surfaceOf('outline')).toHaveStyle({
      backgroundColor: 'transparent',
      borderColor: darkColors.borderStrong,
    });
    expect(surfaceOf('ghost')).toHaveStyle({ backgroundColor: 'transparent' });
    expect(surfaceOf('destructive')).toHaveStyle({ backgroundColor: darkColors.error });
  });

  it('follows the light theme', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Button label={label} testID="b" />
      </ThemeProvider>,
    );
    expect(surfaceOf('b')).toHaveStyle({ backgroundColor: lightColors.primary });
    expect(screen.getByText(label)).toHaveStyle({ color: lightColors.onPrimary });
  });

  it('sizes to 40 / 48 / 56 and pads small buttons up to the 44pt hit target', async () => {
    await renderDark(
      <>
        <Button label={label} size="sm" testID="sm" />
        <Button label={label} size="md" testID="md" />
        <Button label={label} size="lg" testID="lg" />
      </>,
    );
    expect(screen.getByTestId('sm')).toHaveStyle({ height: spacing[10] });
    expect(screen.getByTestId('md')).toHaveStyle({ height: spacing[12] });
    expect(screen.getByTestId('lg')).toHaveStyle({ height: spacing[12] + spacing[2] });
    expect(screen.getByTestId('sm').props.hitSlop).toEqual({ top: 2, bottom: 2 });
    expect(screen.getByTestId('md').props.hitSlop).toBeUndefined();
  });

  it('stretches when fullWidth and renders icons on both sides', async () => {
    await renderDark(
      <Button label={label} fullWidth leftIcon={Check} rightIcon={ArrowRight} testID="b" />,
    );
    expect(screen.getByTestId('b')).toHaveStyle({ alignSelf: 'stretch' });
    expect(screen.getByText(label).parent?.children).toHaveLength(3);
  });
});
