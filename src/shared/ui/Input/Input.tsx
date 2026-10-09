import { Eye, EyeOff, X, type LucideIcon } from 'lucide-react-native';
import { useRef, useState, type ReactNode, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { IconButton } from '@/shared/ui/IconButton';
import { Text } from '@/shared/ui/Text';

import { fieldBorder, FIELD_BORDER_WIDTH, focusRingStyle } from './fieldStyles';

type ClearableProps =
  { clearable: true; clearLabel: string } | { clearable?: false; clearLabel?: undefined };

export type SecureToggleLabels = { show: string; hide: string };

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

export type InputProps = Omit<TextInputProps, 'style' | 'editable'> &
  ClearableProps & {
    ref?: Ref<TextInput>;
    label?: string;
    helperText?: string;
    /** Replaces `helperText`, paints the field in the error color and is announced politely. */
    errorText?: string;
    leftIcon?: LucideIcon;
    /** Custom trailing content (unit, counter, button). */
    rightSlot?: ReactNode;
    /** Renders a show/hide toggle for `secureTextEntry` fields. */
    secureToggleLabels?: SecureToggleLabels;
    disabled?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
  };

/** Labelled text field for controlled use (`value` / `onChangeText`; wrap in a Controller for forms). */
export function Input({
  ref,
  label,
  helperText,
  errorText,
  leftIcon: LeftIcon,
  rightSlot,
  clearable,
  clearLabel,
  secureTextEntry = false,
  secureToggleLabels,
  disabled = false,
  containerStyle,
  inputStyle,
  value,
  onChangeText,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...rest
}: InputProps) {
  const { colors, spacing, radii, typography } = useTheme();
  const innerRef = useRef<TextInput | null>(null);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasError = errorText !== undefined && errorText.length > 0;
  const showClear = clearable === true && !disabled && value !== undefined && value.length > 0;
  const showToggle = secureTextEntry && secureToggleLabels !== undefined;
  const iconColor = hasError ? colors.error : focused ? colors.primary : colors.textSecondary;

  const attachRef = (node: TextInput | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const handleFocus = (event: FocusEvent) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: BlurEvent) => {
    setFocused(false);
    onBlur?.(event);
  };

  const handleClear = () => {
    onChangeText?.('');
    innerRef.current?.focus();
  };

  return (
    <View style={[styles.container, { gap: spacing[1] }, containerStyle]}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <View
        testID={testID ? `${testID}-field` : undefined}
        style={[
          styles.field,
          {
            height: spacing[12],
            paddingHorizontal: spacing[3],
            gap: spacing[2],
            borderRadius: radii.sm,
            borderWidth: FIELD_BORDER_WIDTH,
            borderColor: fieldBorder(colors, { focused, error: hasError }),
            backgroundColor: colors.inputBackground,
          },
          focused ? focusRingStyle(colors) : null,
          disabled ? styles.disabled : null,
        ]}
      >
        {LeftIcon ? <LeftIcon size={spacing[5]} color={iconColor} /> : null}
        <TextInput
          {...rest}
          ref={attachRef}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !revealed}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint ?? (hasError ? errorText : helperText)}
          accessibilityState={{ disabled }}
          style={[styles.input, typography.body, { color: colors.textPrimary }, inputStyle]}
        />
        {showClear ? (
          <IconButton
            icon={X}
            accessibilityLabel={clearLabel}
            onPress={handleClear}
            hapticsEnabled={false}
            testID={testID ? `${testID}-clear` : undefined}
          />
        ) : null}
        {showToggle ? (
          <IconButton
            icon={revealed ? EyeOff : Eye}
            accessibilityLabel={revealed ? secureToggleLabels.hide : secureToggleLabels.show}
            onPress={() => setRevealed((current) => !current)}
            hapticsEnabled={false}
            testID={testID ? `${testID}-toggle` : undefined}
          />
        ) : null}
        {rightSlot}
      </View>
      {hasError ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {errorText}
        </Text>
      ) : helperText ? (
        <Text variant="caption" color="textSecondary">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  field: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, paddingVertical: 0, minWidth: 0 },
  disabled: { opacity: 0.5 },
});
