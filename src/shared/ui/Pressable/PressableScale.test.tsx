import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { haptics } from '@/shared/theme/haptics';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { motion } from '@/shared/theme/tokens';

import { DISABLED_OPACITY, PressableScale } from './PressableScale';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined) },
}));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    useReducedMotion: jest.fn(() => false),
    withSpring: jest.fn(actual.withSpring),
  };
});

const withSpringMock = jest.mocked(Reanimated.withSpring);
const useReducedMotionMock = jest.mocked(Reanimated.useReducedMotion);
const selectionMock = jest.mocked(haptics.selection);
const label = 'Open';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('PressableScale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useReducedMotionMock.mockReturnValue(false);
  });

  it('renders children, defaults to the button role and fires onPress', async () => {
    const onPress = jest.fn();
    await renderDark(
      <PressableScale onPress={onPress} accessibilityLabel={label}>
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    const button = screen.getByRole('button', { name: label });
    expect(button).toBeOnTheScreen();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(selectionMock).not.toHaveBeenCalled();
  });

  it('plays the selection haptic when enabled', async () => {
    await renderDark(
      <PressableScale hapticsEnabled accessibilityLabel={label}>
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(selectionMock).toHaveBeenCalledTimes(1);
  });

  it('blocks presses, dims and exposes the disabled state when disabled', async () => {
    const onPress = jest.fn();
    await renderDark(
      <PressableScale disabled onPress={onPress} accessibilityLabel={label} testID="p">
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    const button = screen.getByTestId('p');
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ opacity: DISABLED_OPACITY });
  });

  it('keeps full opacity when dimWhenDisabled is off', async () => {
    await renderDark(
      <PressableScale disabled dimWhenDisabled={false} testID="p">
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    expect(screen.getByTestId('p')).not.toHaveStyle({ opacity: DISABLED_OPACITY });
  });

  it('springs to pressScale on press in and back on press out', async () => {
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    await renderDark(
      <PressableScale onPressIn={onPressIn} onPressOut={onPressOut} testID="p">
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    const button = screen.getByTestId('p');
    await fireEvent(button, 'pressIn');
    expect(withSpringMock).toHaveBeenCalledWith(motion.pressScale, motion.spring);
    expect(onPressIn).toHaveBeenCalledTimes(1);
    await fireEvent(button, 'pressOut');
    expect(withSpringMock).toHaveBeenLastCalledWith(1, motion.spring);
    expect(onPressOut).toHaveBeenCalledTimes(1);
  });

  it('honours a custom scale and skips the animation under reduce motion', async () => {
    useReducedMotionMock.mockReturnValue(true);
    await renderDark(
      <PressableScale scale={0.9} testID="p">
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    await fireEvent(screen.getByTestId('p'), 'pressIn');
    expect(withSpringMock).not.toHaveBeenCalled();
  });

  it('merges accessibilityState with the disabled flag', async () => {
    await renderDark(
      <PressableScale accessibilityState={{ selected: true }} testID="p">
        <RNText>{label}</RNText>
      </PressableScale>,
    );
    expect(screen.getByTestId('p')).toBeSelected();
    expect(screen.getByTestId('p')).not.toBeDisabled();
  });
});
