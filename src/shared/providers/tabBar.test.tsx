import { render, renderHook, screen } from '@testing-library/react-native';
import { Home } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, type ColorScheme } from '@/shared/theme/tokens';
import { iconTestID } from '@/shared/ui/gallery/testing/lucideMock';

import { tabIcon, useTabBarScreenOptions } from './tabBar';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);

function wrapperFor(scheme: ColorScheme) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider scheme={scheme}>{children}</ThemeProvider>;
  };
}

describe('useTabBarScreenOptions', () => {
  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ] as const)('uses the %s tab bar tokens', async (scheme, colors) => {
    const { result } = await renderHook(() => useTabBarScreenOptions(), {
      wrapper: wrapperFor(scheme),
    });
    expect(result.current.headerShown).toBe(false);
    expect(result.current.tabBarActiveTintColor).toBe(colors.tabBarActive);
    expect(result.current.tabBarInactiveTintColor).toBe(colors.tabBarInactive);
    expect(result.current.tabBarStyle.backgroundColor).toBe(colors.surface);
    expect(result.current.tabBarStyle.borderTopColor).toBe(colors.border);
    expect(result.current.sceneStyle.backgroundColor).toBe(colors.background);
  });
});

describe('tabIcon', () => {
  it('renders the lucide icon with the tint and size the tab bar passes', async () => {
    const TabIcon = tabIcon(Home);
    await render(<TabIcon color={lightColors.tabBarActive} size={24} />);
    const icon = screen.getByTestId(iconTestID('Home'));
    expect(icon.props.color).toBe(lightColors.tabBarActive);
    expect(icon.props.size).toBe(24);
  });
});
