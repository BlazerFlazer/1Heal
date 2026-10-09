import {
  createToast,
  DEFAULT_TOAST_DURATION_MS,
  enqueueToast,
  ERROR_TOAST_DURATION_MS,
  isSwipeDismiss,
  MAX_VISIBLE_TOASTS,
  removeToast,
  TOAST_SWIPE_DISTANCE,
  TOAST_SWIPE_VELOCITY,
  toastDuration,
  type ToastQueue,
} from './toastQueue';

describe('toastQueue', () => {
  it('defaults the tone to neutral and the duration by tone', () => {
    expect(createToast(1, { message: 'Saved' })).toEqual({
      id: 1,
      message: 'Saved',
      tone: 'neutral',
      action: undefined,
      durationMs: DEFAULT_TOAST_DURATION_MS,
    });
    expect(toastDuration('error')).toBe(ERROR_TOAST_DURATION_MS);
    expect(toastDuration('success')).toBe(DEFAULT_TOAST_DURATION_MS);
    expect(toastDuration('error', 1500)).toBe(1500);
  });

  it('keeps at most MAX_VISIBLE_TOASTS, evicting the oldest', () => {
    let queue: ToastQueue = [];
    for (let id = 1; id <= MAX_VISIBLE_TOASTS + 2; id += 1) {
      queue = enqueueToast(queue, createToast(id, { message: `#${id}` }));
    }
    expect(queue.map((toast) => toast.id)).toEqual([3, 4, 5]);
  });

  it('removes by id and returns the same array when nothing changes', () => {
    const queue = enqueueToast([], createToast(7, { message: 'a' }));
    expect(removeToast(queue, 7)).toEqual([]);
    expect(removeToast(queue, 8)).toBe(queue);
  });

  it('dismisses on a long enough upward drag or a fast fling', () => {
    expect(isSwipeDismiss(-TOAST_SWIPE_DISTANCE - 1, 0)).toBe(true);
    expect(isSwipeDismiss(-5, -TOAST_SWIPE_VELOCITY - 1)).toBe(true);
    expect(isSwipeDismiss(-5, -10)).toBe(false);
    expect(isSwipeDismiss(50, 900)).toBe(false);
  });
});
