import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react-native';

import type { ThemeColors } from '@/shared/theme/tokens';

import type { ToastTone } from './toastQueue';

export type ToastPalette = {
  background: keyof ThemeColors;
  foreground: keyof ThemeColors;
  icon: LucideIcon | null;
};

/** Color roles and icon per tone; roles are resolved against the active theme by the item. */
export function toastPalette(tone: ToastTone): ToastPalette {
  switch (tone) {
    case 'success':
      return { background: 'successBg', foreground: 'onSuccessBg', icon: CircleCheck };
    case 'error':
      return { background: 'errorBg', foreground: 'onErrorBg', icon: CircleAlert };
    case 'info':
      return { background: 'infoBg', foreground: 'onInfoBg', icon: Info };
    case 'neutral':
      return { background: 'surfaceElevated', foreground: 'textPrimary', icon: null };
  }
}
