/** How many toasts can be on screen at once; a newer one evicts the oldest. */
export const MAX_VISIBLE_TOASTS = 3;
export const DEFAULT_TOAST_DURATION_MS = 4000;
/** Errors stay longer so the message can be read. */
export const ERROR_TOAST_DURATION_MS = 6000;
/** Upward drag (pt) or fling velocity (pt/s) that dismisses a toast. */
export const TOAST_SWIPE_DISTANCE = 24;
export const TOAST_SWIPE_VELOCITY = 500;

export type ToastTone = 'success' | 'error' | 'info' | 'neutral';

export type ToastAction = { label: string; onPress: () => void };

export type ToastOptions = {
  message: string;
  /** Defaults to `neutral`. */
  tone?: ToastTone;
  /** Optional text button; pressing it also dismisses the toast. */
  action?: ToastAction;
  /** Auto-dismiss delay. Defaults to 4 s, 6 s for errors. */
  durationMs?: number;
};

export type ToastRecord = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number;
};

export type ToastQueue = readonly ToastRecord[];

export function toastDuration(tone: ToastTone, durationMs?: number): number {
  if (durationMs !== undefined) {
    return durationMs;
  }
  return tone === 'error' ? ERROR_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS;
}

export function createToast(id: number, options: ToastOptions): ToastRecord {
  const tone = options.tone ?? 'neutral';
  return {
    id,
    message: options.message,
    tone,
    action: options.action,
    durationMs: toastDuration(tone, options.durationMs),
  };
}

/** Appends a toast, evicting the oldest once more than `MAX_VISIBLE_TOASTS` would show. */
export function enqueueToast(queue: ToastQueue, toast: ToastRecord): ToastQueue {
  return [...queue, toast].slice(-MAX_VISIBLE_TOASTS);
}

/** Removes a toast by id; returns the same array when the id is not present. */
export function removeToast(queue: ToastQueue, id: number): ToastQueue {
  const next = queue.filter((toast) => toast.id !== id);
  return next.length === queue.length ? queue : next;
}

/** Whether an upward pan should dismiss the toast (runs on the UI thread). */
export function isSwipeDismiss(translationY: number, velocityY: number): boolean {
  'worklet';
  return translationY < -TOAST_SWIPE_DISTANCE || velocityY < -TOAST_SWIPE_VELOCITY;
}
