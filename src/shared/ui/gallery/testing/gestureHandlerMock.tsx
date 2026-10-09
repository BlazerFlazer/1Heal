import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

/**
 * Test double for `react-native-gesture-handler`. The real module needs its native
 * `jestSetup` registered before anything imports it, which the project Jest config does not
 * do; this mock also records the worklet callbacks so a test can drive a drag directly.
 *
 * Usage (must be a top-level `jest.mock` in the test file):
 * `jest.mock('react-native-gesture-handler', () =>
 *   jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock())`
 */
export type GestureEvent = Record<string, unknown>;
export type GestureCallback = (event: GestureEvent, success?: boolean) => void;

const CALLBACK_NAMES = [
  'onBegin',
  'onStart',
  'onUpdate',
  'onChange',
  'onEnd',
  'onFinalize',
] as const;
const CONFIG_NAMES = [
  'enabled',
  'activeOffsetX',
  'activeOffsetY',
  'failOffsetX',
  'failOffsetY',
  'minDistance',
  'hitSlop',
  'shouldCancelWhenOutside',
  'runOnJS',
  'withTestId',
] as const;

type CallbackName = (typeof CALLBACK_NAMES)[number];
type ConfigName = (typeof CONFIG_NAMES)[number];

export type MockGesture = {
  callbacks: Partial<Record<CallbackName, GestureCallback>>;
  config: Partial<Record<ConfigName, unknown>>;
} & Record<CallbackName, (callback: GestureCallback) => MockGesture> &
  Record<ConfigName, (value: unknown) => MockGesture>;

const registry: MockGesture[] = [];

function createGesture(): MockGesture {
  const gesture = { callbacks: {}, config: {} } as MockGesture;
  for (const name of CALLBACK_NAMES) {
    gesture[name] = (callback) => {
      gesture.callbacks[name] = callback;
      return gesture;
    };
  }
  for (const name of CONFIG_NAMES) {
    gesture[name] = (value) => {
      gesture.config[name] = value;
      return gesture;
    };
  }
  registry.push(gesture);
  return gesture;
}

/** The gesture built most recently (the one attached by the latest render). */
export function latestGesture(): MockGesture {
  const gesture = registry[registry.length - 1];
  if (gesture === undefined) {
    throw new Error('No gesture has been created yet');
  }
  return gesture;
}

export function resetGestures(): void {
  registry.length = 0;
}

export function createGestureHandlerMock() {
  return {
    __esModule: true,
    Gesture: { Pan: createGesture, Tap: createGesture, Native: createGesture },
    GestureDetector: ({ children }: { children: ReactNode }) => children,
    GestureHandlerRootView: View,
    ScrollView,
  };
}
