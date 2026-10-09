import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { motion } from '@/shared/theme/tokens';

/** Fraction of the panel height that must be dragged down to dismiss. */
export const SHEET_DISMISS_RATIO = 0.3;
/** Downward fling velocity (pt/s) that dismisses regardless of distance. */
export const SHEET_DISMISS_VELOCITY = 800;
/** How much of an upward drag the panel follows (rubber-band). */
export const SHEET_OVERDRAG_RESISTANCE = 0.2;
/** Vertical movement (pt) before the pan activates, so taps on the header still land. */
export const SHEET_PAN_ACTIVATION = 8;

/** Panel offset for a drag: follows downward moves, resists upward ones. */
export function sheetDragOffset(translationY: number): number {
  'worklet';
  return translationY >= 0 ? translationY : translationY * SHEET_OVERDRAG_RESISTANCE;
}

/** Whether releasing the drag should close the sheet. */
export function shouldDismissSheet(
  translationY: number,
  velocityY: number,
  panelHeight: number,
): boolean {
  'worklet';
  return velocityY > SHEET_DISMISS_VELOCITY || translationY > panelHeight * SHEET_DISMISS_RATIO;
}

export type SheetGestureOptions = {
  /** Live drag offset applied to the panel. */
  dragY: SharedValue<number>;
  /** Measured panel height, for the dismiss threshold. */
  panelHeight: SharedValue<number>;
  enabled: boolean;
  /** Runs on the JS thread once a drag crosses the dismiss threshold. */
  onDismiss: () => void;
};

/** Drag-to-close pan for the sheet header: follows the finger, springs back or dismisses. */
export function useSheetGesture({
  dragY,
  panelHeight,
  enabled,
  onDismiss,
}: SheetGestureOptions): PanGesture {
  return Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY([-SHEET_PAN_ACTIVATION, SHEET_PAN_ACTIVATION])
    .onUpdate((event) => {
      dragY.set(sheetDragOffset(event.translationY));
    })
    .onEnd((event) => {
      if (shouldDismissSheet(event.translationY, event.velocityY, panelHeight.get())) {
        scheduleOnRN(onDismiss);
      } else {
        dragY.set(withSpring(0, motion.spring));
      }
    });
}
