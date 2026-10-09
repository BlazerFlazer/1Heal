import type { ViewStyle } from 'react-native';

import type { ThemeColors } from '@/shared/theme/tokens';

export const FIELD_BORDER_WIDTH = 1;
/** Focus ring is drawn with `outline*` so it never shifts layout. */
export const FOCUS_RING_WIDTH = 2;
export const FOCUS_RING_OFFSET = 1;

export type FieldState = { focused: boolean; error: boolean };

/** Error beats focus; focus beats rest. Shared by `Input` and `OTPInput` cells. */
export function fieldBorder(colors: ThemeColors, state: FieldState): string {
  if (state.error) {
    return colors.error;
  }
  return state.focused ? colors.focusRing : colors.border;
}

export function focusRingStyle(colors: ThemeColors): ViewStyle {
  return {
    outlineWidth: FOCUS_RING_WIDTH,
    outlineOffset: FOCUS_RING_OFFSET,
    outlineStyle: 'solid',
    outlineColor: colors.focusRing,
  };
}
