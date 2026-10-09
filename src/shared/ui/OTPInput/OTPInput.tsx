import { useEffect, useState, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/shared/theme/motion';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { motion } from '@/shared/theme/tokens';
import { fieldBorder, FIELD_BORDER_WIDTH, focusRingStyle } from '@/shared/ui/Input';
import { Text } from '@/shared/ui/Text';

export const OTP_DEFAULT_LENGTH = 6;

export type OTPInputProps = {
  value: string;
  onChange: (code: string) => void;
  /** Fires once when the last digit lands (typed, pasted or autofilled). */
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** Paints cells in the error color and shakes the row (unless reduce motion is on). */
  error?: boolean;
  disabled?: boolean;
  /** Spoken name of the whole code field, e.g. t('auth.otp.codeLabel'). */
  accessibilityLabel: string;
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Keeps only digits, capped to `length`. Pasted text and SMS autofill flow through here. */
export function sanitizeOtp(text: string, length: number): string {
  return text.replace(/\D/g, '').slice(0, length);
}

const SHAKE_STEP_MS = motion.durations.fast / 3;

/**
 * One hidden `TextInput` owns the whole code (so SMS autofill and paste work) and `length`
 * visual cells mirror it. Only the hidden input is exposed to assistive tech.
 */
export function OTPInput({
  value,
  onChange,
  onComplete,
  length = OTP_DEFAULT_LENGTH,
  autoFocus = false,
  error = false,
  disabled = false,
  accessibilityLabel,
  ref,
  style,
  testID,
}: OTPInputProps) {
  const { colors, spacing, radii } = useTheme();
  const reduceMotion = useReduceMotion();
  const [focused, setFocused] = useState(false);
  const digits = sanitizeOtp(value, length);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!error || reduceMotion) {
      return;
    }
    const far = spacing[2];
    const near = spacing[1];
    offset.set(
      withSequence(
        withTiming(-far, { duration: SHAKE_STEP_MS }),
        withTiming(far, { duration: SHAKE_STEP_MS }),
        withTiming(-near, { duration: SHAKE_STEP_MS }),
        withTiming(near, { duration: SHAKE_STEP_MS }),
        withTiming(0, { duration: SHAKE_STEP_MS }),
      ),
    );
  }, [error, offset, reduceMotion, spacing]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));

  const handleChangeText = (text: string) => {
    const next = sanitizeOtp(text, length);
    onChange(next);
    if (next.length === length && next !== digits) {
      onComplete?.(next);
    }
  };

  const cells = Array.from({ length }, (_, index) => {
    const digit = digits[index] ?? '';
    const active = focused && !disabled && index === Math.min(digits.length, length - 1);
    return (
      <View
        key={index}
        testID={testID ? `${testID}-cell-${index}` : undefined}
        style={[
          styles.cell,
          {
            width: spacing[12],
            height: spacing[12] + spacing[2],
            borderRadius: radii.sm,
            borderWidth: FIELD_BORDER_WIDTH,
            borderColor: fieldBorder(colors, { focused: active, error }),
            backgroundColor: colors.inputBackground,
          },
          active ? focusRingStyle(colors) : null,
        ]}
      >
        <Text variant="title">{digit}</Text>
      </View>
    );
  });

  return (
    <Animated.View style={[styles.row, { gap: spacing[2] }, shakeStyle, style]}>
      <View style={[styles.row, { gap: spacing[2] }]} aria-hidden>
        {cells}
      </View>
      <TextInput
        ref={ref}
        testID={testID}
        value={digits}
        onChangeText={handleChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        autoCorrect={false}
        caretHidden
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        style={[StyleSheet.absoluteFill, styles.hiddenInput]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'center' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { opacity: 0 },
});
