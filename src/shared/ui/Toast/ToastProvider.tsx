import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/shared/theme/haptics';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { zIndex } from '@/shared/theme/tokens';

import { ToastContext, type ToastApi, type ToastHandle } from './ToastContext';
import { ToastItem } from './ToastItem';
import {
  createToast,
  enqueueToast,
  removeToast,
  type ToastOptions,
  type ToastQueue,
} from './toastQueue';

export type ToastProviderProps = {
  children: ReactNode;
  /** Applied to the host; each toast gets `${testID}-${id}`. */
  testID?: string;
};

/** Hosts toasts at the top of the screen, under the status bar, above everything else. */
export function ToastProvider({ children, testID }: ToastProviderProps) {
  const [queue, setQueue] = useState<ToastQueue>([]);
  const nextId = useRef(1);
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  const dismiss = useCallback((id: number) => {
    setQueue((current) => removeToast(current, id));
  }, []);

  const dismissAll = useCallback(() => {
    setQueue([]);
  }, []);

  const show = useCallback(
    (options: ToastOptions): ToastHandle => {
      const id = nextId.current;
      nextId.current += 1;
      const toast = createToast(id, options);
      setQueue((current) => enqueueToast(current, toast));
      if (toast.tone === 'success') {
        void haptics.success();
      } else if (toast.tone === 'error') {
        void haptics.error();
      }
      AccessibilityInfo.announceForAccessibility(toast.message);
      return { id, dismiss: () => dismiss(id) };
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ show, dismiss, dismissAll }), [show, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        testID={testID}
        pointerEvents="box-none"
        style={[
          styles.host,
          { top: insets.top + spacing[2], left: spacing[4], right: spacing[4], gap: spacing[2] },
        ]}
      >
        {queue.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
            testID={testID === undefined ? undefined : `${testID}-${toast.id}`}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', zIndex: zIndex.toast },
});
