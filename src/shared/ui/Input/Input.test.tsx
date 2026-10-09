import { fireEvent, render, screen } from '@testing-library/react-native';
import { Phone } from 'lucide-react-native';
import { createRef } from 'react';
import { TextInput, Text as RNText } from 'react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors } from '@/shared/theme/tokens';

import { fieldBorder, FOCUS_RING_WIDTH } from './fieldStyles';
import { Input } from './Input';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/shared/theme/haptics', () => ({
  haptics: { selection: jest.fn(async () => undefined) },
}));

const label = 'Phone';
const helper = 'We will send a code';
const error = 'Invalid number';
const clearLabel = 'Clear';
const toggleLabels = { show: 'Show password', hide: 'Hide password' };

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('fieldBorder', () => {
  it('ranks error above focus above rest', () => {
    expect(fieldBorder(lightColors, { focused: true, error: true })).toBe(lightColors.error);
    expect(fieldBorder(lightColors, { focused: true, error: false })).toBe(lightColors.focusRing);
    expect(fieldBorder(lightColors, { focused: false, error: false })).toBe(lightColors.border);
  });
});

describe('Input', () => {
  it('renders label, helper and a labelled text input that reports changes', async () => {
    const onChangeText = jest.fn();
    await renderDark(
      <Input label={label} helperText={helper} value="" onChangeText={onChangeText} testID="i" />,
    );
    const input = screen.getByLabelText(label);
    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.getByText(helper)).toBeOnTheScreen();
    expect(input.props.accessibilityHint).toBe(helper);
    await fireEvent.changeText(input, '90');
    expect(onChangeText).toHaveBeenCalledWith('90');
    expect(screen.getByTestId('i-field')).toHaveStyle({
      backgroundColor: darkColors.inputBackground,
      borderColor: darkColors.border,
    });
  });

  it('draws a focus ring while focused and drops it on blur', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await renderDark(<Input label={label} onFocus={onFocus} onBlur={onBlur} testID="i" />);
    const input = screen.getByTestId('i');
    await fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('i-field')).toHaveStyle({
      borderColor: darkColors.focusRing,
      outlineWidth: FOCUS_RING_WIDTH,
      outlineColor: darkColors.focusRing,
    });
    await fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('i-field')).not.toHaveStyle({ outlineWidth: FOCUS_RING_WIDTH });
  });

  it('shows the error instead of the helper, in the error color, as a live region', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Input label={label} helperText={helper} errorText={error} testID="i" />
      </ThemeProvider>,
    );
    expect(screen.queryByText(helper)).toBeNull();
    const message = screen.getByText(error);
    expect(message).toHaveStyle({ color: lightColors.error });
    expect(message.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByTestId('i-field')).toHaveStyle({ borderColor: lightColors.error });
    expect(screen.getByTestId('i').props.accessibilityHint).toBe(error);
  });

  it('clears the value through an accessible button only when there is text', async () => {
    const onChangeText = jest.fn();
    const { rerender } = await renderDark(
      <Input
        label={label}
        value=""
        onChangeText={onChangeText}
        clearable
        clearLabel={clearLabel}
      />,
    );
    expect(screen.queryByRole('button', { name: clearLabel })).toBeNull();
    await rerender(
      <ThemeProvider>
        <Input
          label={label}
          value="998"
          onChangeText={onChangeText}
          clearable
          clearLabel={clearLabel}
        />
      </ThemeProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: clearLabel }));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('toggles secure entry with labelled show / hide buttons', async () => {
    await renderDark(
      <Input
        label={label}
        value="secret"
        secureTextEntry
        secureToggleLabels={toggleLabels}
        testID="i"
      />,
    );
    expect(screen.getByTestId('i').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: toggleLabels.show }));
    expect(screen.getByTestId('i').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: toggleLabels.hide }));
    expect(screen.getByTestId('i').props.secureTextEntry).toBe(true);
  });

  it('is not editable when disabled and hides the clear button', async () => {
    await renderDark(
      <Input label={label} value="998" disabled clearable clearLabel={clearLabel} testID="i" />,
    );
    const input = screen.getByTestId('i');
    expect(input.props.editable).toBe(false);
    expect(input).toBeDisabled();
    expect(screen.queryByRole('button', { name: clearLabel })).toBeNull();
  });

  it('renders a left icon and a right slot, forwards the ref and passes TextInput props', async () => {
    const ref = createRef<TextInput>();
    await renderDark(
      <Input
        ref={ref}
        label={label}
        leftIcon={Phone}
        rightSlot={<RNText>{helper}</RNText>}
        keyboardType="phone-pad"
        placeholder={helper}
        testID="i"
      />,
    );
    expect(ref.current).not.toBeNull();
    expect(screen.getByTestId('i').props.keyboardType).toBe('phone-pad');
    expect(screen.getByTestId('i').props.placeholderTextColor).toBe(darkColors.textSecondary);
    expect(screen.getByTestId('i-field').children).toHaveLength(3);
    expect(screen.getByText(helper)).toBeOnTheScreen();
  });
});
