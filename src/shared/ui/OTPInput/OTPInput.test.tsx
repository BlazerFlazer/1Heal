import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Reanimated from 'react-native-reanimated';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors } from '@/shared/theme/tokens';
import { FOCUS_RING_WIDTH } from '@/shared/ui/Input';

import { OTPInput, sanitizeOtp } from './OTPInput';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    useReducedMotion: jest.fn(() => false),
    withSequence: jest.fn(actual.withSequence),
  };
});

const useReducedMotionMock = jest.mocked(Reanimated.useReducedMotion);
const withSequenceMock = jest.mocked(Reanimated.withSequence);
const label = 'SMS code';
/** Cells are hidden from assistive tech by design, so queries must opt in to see them. */
const hidden = { includeHiddenElements: true } as const;

function cell(testID: string) {
  return screen.getByTestId(testID, hidden);
}

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('sanitizeOtp', () => {
  it('keeps digits only and caps the length', () => {
    expect(sanitizeOtp('12 34-56', 6)).toBe('123456');
    expect(sanitizeOtp('Your code is 9876', 4)).toBe('9876');
    expect(sanitizeOtp('1234567', 6)).toBe('123456');
    expect(sanitizeOtp('', 6)).toBe('');
  });
});

describe('OTPInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useReducedMotionMock.mockReturnValue(false);
  });

  it('renders one hidden autofill-ready input and six cells mirroring the value', async () => {
    await renderDark(
      <OTPInput value="12" onChange={jest.fn()} accessibilityLabel={label} testID="otp" />,
    );
    const input = screen.getByLabelText(label);
    expect(input.props.value).toBe('12');
    expect(input.props.maxLength).toBe(6);
    expect(input.props.textContentType).toBe('oneTimeCode');
    expect(input.props.autoComplete).toBe(Platform.OS === 'android' ? 'sms-otp' : 'one-time-code');
    expect(input).toHaveStyle({ opacity: 0 });
    expect(screen.getAllByTestId(/otp-cell-\d/, hidden)).toHaveLength(6);
    expect(screen.getByText('1', hidden)).toBeOnTheScreen();
    expect(screen.getByText('2', hidden)).toBeOnTheScreen();
    expect(screen.queryByText('1')).toBeNull();
    expect(cell('otp-cell-0')).toHaveStyle({
      backgroundColor: darkColors.inputBackground,
      borderColor: darkColors.border,
    });
  });

  it('sanitises typed and pasted text and fires onComplete once on the last digit', async () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    await renderDark(
      <OTPInput value="" onChange={onChange} onComplete={onComplete} accessibilityLabel={label} />,
    );
    const input = screen.getByLabelText(label);
    await fireEvent.changeText(input, '12a');
    expect(onChange).toHaveBeenLastCalledWith('12');
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.changeText(input, 'Code: 123456 78');
    expect(onChange).toHaveBeenLastCalledWith('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('does not re-fire onComplete when the full value is re-entered unchanged', async () => {
    const onComplete = jest.fn();
    await renderDark(
      <OTPInput
        value="1234"
        onChange={jest.fn()}
        onComplete={onComplete}
        length={4}
        accessibilityLabel={label}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText(label), '1234');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('highlights the active cell while focused and honours length / autoFocus', async () => {
    await render(
      <ThemeProvider scheme="light">
        <OTPInput
          value="1"
          onChange={jest.fn()}
          length={4}
          autoFocus
          accessibilityLabel={label}
          testID="otp"
        />
      </ThemeProvider>,
    );
    const input = screen.getByTestId('otp');
    expect(input.props.autoFocus).toBe(true);
    expect(screen.getAllByTestId(/otp-cell-\d/, hidden)).toHaveLength(4);
    await fireEvent(input, 'focus');
    expect(cell('otp-cell-1')).toHaveStyle({
      borderColor: lightColors.focusRing,
      outlineWidth: FOCUS_RING_WIDTH,
    });
    expect(cell('otp-cell-0')).not.toHaveStyle({ outlineWidth: FOCUS_RING_WIDTH });
    await fireEvent(input, 'blur');
    expect(cell('otp-cell-1')).not.toHaveStyle({ outlineWidth: FOCUS_RING_WIDTH });
  });

  it('paints cells in the error color and shakes, but not under reduce motion', async () => {
    const { rerender } = await renderDark(
      <OTPInput
        value="123456"
        onChange={jest.fn()}
        error
        accessibilityLabel={label}
        testID="otp"
      />,
    );
    expect(cell('otp-cell-5')).toHaveStyle({ borderColor: darkColors.error });
    expect(withSequenceMock).toHaveBeenCalledTimes(1);

    withSequenceMock.mockClear();
    useReducedMotionMock.mockReturnValue(true);
    await rerender(
      <ThemeProvider>
        <OTPInput value="" onChange={jest.fn()} error accessibilityLabel={label} testID="rm" />
      </ThemeProvider>,
    );
    expect(withSequenceMock).not.toHaveBeenCalled();
  });

  it('is not editable when disabled', async () => {
    await renderDark(
      <OTPInput value="" onChange={jest.fn()} disabled accessibilityLabel={label} />,
    );
    const input = screen.getByLabelText(label);
    expect(input.props.editable).toBe(false);
    expect(input).toBeDisabled();
  });
});
