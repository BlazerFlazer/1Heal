import { render } from '@testing-library/react-native';
import * as ExpoStatusBar from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors } from '@/shared/theme/tokens';

import { ThemedStatusBar } from './ThemedStatusBar';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-status-bar', () => ({ StatusBar: jest.fn(() => null) }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));

const StatusBar = jest.mocked(ExpoStatusBar.StatusBar);
const setBackgroundColorAsync = jest.mocked(SystemUI.setBackgroundColorAsync);

describe('ThemedStatusBar', () => {
  beforeEach(() => {
    StatusBar.mockClear();
    setBackgroundColorAsync.mockClear();
  });

  it('uses dark icons on the light theme and paints the root view to match', async () => {
    await render(
      <ThemeProvider scheme="light">
        <ThemedStatusBar />
      </ThemeProvider>,
    );
    expect(StatusBar).toHaveBeenLastCalledWith(
      expect.objectContaining({ style: 'dark', animated: true }),
      undefined,
    );
    expect(setBackgroundColorAsync).toHaveBeenCalledWith(lightColors.background);
  });

  it('uses light icons on the dark theme', async () => {
    await render(
      <ThemeProvider scheme="dark">
        <ThemedStatusBar />
      </ThemeProvider>,
    );
    expect(StatusBar).toHaveBeenLastCalledWith(
      expect.objectContaining({ style: 'light' }),
      undefined,
    );
    expect(setBackgroundColorAsync).toHaveBeenCalledWith(darkColors.background);
  });
});
