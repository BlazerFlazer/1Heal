import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Haptics are best-effort: never throw, never run on web. */
async function run(trigger: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await trigger();
  } catch {
    // Missing hardware, simulator or disabled haptics: silently ignore.
  }
}

export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
} as const;

export type HapticKind = keyof typeof haptics;
