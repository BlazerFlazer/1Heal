import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { iconTestID } from '@/shared/ui/gallery/testing/lucideMock';

import { ErrorState, openAppSettings, type ErrorStateProps } from './ErrorState';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);

function renderError(props: Partial<ErrorStateProps> = {}) {
  return render(
    <ThemeProvider scheme="light">
      <ErrorState testID="error" {...props} />
    </ThemeProvider>,
  );
}

describe('ErrorState', () => {
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    openSettings.mockClear();
  });

  it('defaults to the generic variant with a polite live region and a retry button', async () => {
    const onRetry = jest.fn();
    await renderError({ onRetry });
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
    expect(screen.getByText("We're on it. Please try again in a moment.")).toBeOnTheScreen();
    expect(
      screen.getByTestId(iconTestID('CircleAlert'), { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('error').props.accessibilityLiveRegion).toBe('polite');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each<[ErrorStateProps['variant'], string, string]>([
    ['offline', 'No connection', 'WifiOff'],
    ['notFound', 'Page not found', 'SearchX'],
  ])('renders the %s variant copy and icon', async (variant, title, icon) => {
    await renderError({ variant });
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(screen.getByTestId(iconTestID(icon), { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the OS settings for permissionDenied and demotes retry to secondary', async () => {
    const onRetry = jest.fn();
    await renderError({ variant: 'permissionDenied', onRetry });
    expect(screen.getByRole('header', { name: 'Permission needed' })).toBeOnTheScreen();
    expect(
      screen.getByTestId(iconTestID('Lock'), { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('error-secondary')).toHaveTextContent('Try again');
    await fireEvent.press(screen.getByTestId('error-secondary'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('lets props override every default', async () => {
    const onHome = jest.fn();
    await renderError({
      variant: 'notFound',
      title: 'Venue not found',
      body: 'It may have left the network.',
      retryLabel: 'Reload',
      onRetry: jest.fn(),
      primaryAction: { label: 'Go home', onPress: onHome },
    });
    expect(screen.getByRole('header', { name: 'Venue not found' })).toBeOnTheScreen();
    expect(screen.getByText('It may have left the network.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('error-primary'));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('error-secondary')).toHaveTextContent('Reload');
  });

  it('switches copy with the language', async () => {
    await i18n.changeLanguage('ru');
    try {
      await renderError({ variant: 'offline' });
      expect(screen.getByRole('header', { name: 'Нет соединения' })).toBeOnTheScreen();
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('never calls Linking.openSettings on web and swallows native rejections', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'web');
    try {
      openAppSettings();
    } finally {
      restore.restore();
    }
    expect(openSettings).not.toHaveBeenCalled();

    openSettings.mockRejectedValueOnce(new Error('unsupported'));
    expect(() => openAppSettings()).not.toThrow();
    await Promise.resolve();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
