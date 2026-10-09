import type { ComponentType } from 'react';
import { View } from 'react-native';

/**
 * Test double for `lucide-react-native`. Jest resolves the package to its untransformed ESM
 * build (the `react-native` export condition), which the project transform does not cover; until
 * `jest.config.js` maps it, tests stand icons in with a `View` tagged `lucide-<IconName>`.
 *
 * Usage (must be a top-level `jest.mock` in the test file):
 * `jest.mock('lucide-react-native', () =>
 *   jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock())`
 */
export type MockIconProps = Record<string, unknown>;

const icons = new Map<string, ComponentType<MockIconProps>>();

export function iconTestID(name: string): string {
  return `lucide-${name}`;
}

function iconFor(name: string): ComponentType<MockIconProps> {
  const cached = icons.get(name);
  if (cached !== undefined) {
    return cached;
  }
  const Icon = (props: MockIconProps) => <View {...props} testID={iconTestID(name)} />;
  Icon.displayName = name;
  icons.set(name, Icon);
  return Icon;
}

export function createLucideMock(): Record<string, unknown> {
  const base: Record<string, unknown> = { __esModule: true };
  return new Proxy(base, {
    get: (target, key) => {
      if (typeof key !== 'string') {
        return undefined;
      }
      return key in target ? target[key] : iconFor(key);
    },
  });
}
