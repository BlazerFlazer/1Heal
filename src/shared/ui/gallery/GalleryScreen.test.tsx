import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/shared/i18n';
import { useThemeStore } from '@/shared/theme/themeStore';

import { GALLERY_SECTIONS, GalleryScreen } from './GalleryScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    medium: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
    warning: jest.fn(async () => undefined),
    error: jest.fn(async () => undefined),
  },
}));

describe('GalleryScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    useThemeStore.setState({ preference: 'system' });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders the header, the switches and every section', async () => {
    await render(<GalleryScreen />);
    expect(screen.getByText('Every component in every state')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'System', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'English', selected: true })).toBeOnTheScreen();
    for (const { key } of GALLERY_SECTIONS) {
      expect(screen.getByTestId(`gallery-${key}`)).toBeOnTheScreen();
      expect(
        screen.getByRole('header', { name: i18n.t(`ui.gallery.sections.${key}`) }),
      ).toBeOnTheScreen();
    }
    for (const variant of ['generic', 'offline', 'permissionDenied', 'notFound']) {
      expect(screen.getByTestId(`gallery-error-${variant}`)).toBeOnTheScreen();
    }
  });

  it('switches the theme preference and the language', async () => {
    await render(<GalleryScreen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Dark' }));
    expect(useThemeStore.getState().preference).toBe('dark');

    await fireEvent.press(screen.getByRole('tab', { name: 'Русский' }));
    try {
      expect(i18n.language).toBe('ru');
      expect(screen.getByText('Все компоненты во всех состояниях')).toBeOnTheScreen();
    } finally {
      await act(async () => {
        await i18n.changeLanguage('en');
      });
    }
  });

  it('opens the sheet and shows a toast', async () => {
    await render(<GalleryScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Open sheet' }));
    expect(screen.getByTestId('gallery-sheet-panel')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Filters' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'success' }));
    expect(screen.getByText('Booking confirmed')).toBeOnTheScreen();
  });
});
