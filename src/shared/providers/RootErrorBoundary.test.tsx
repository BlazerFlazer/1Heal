import { fireEvent, render, screen } from '@testing-library/react-native';

import { i18n } from '@/shared/i18n';

import { RootErrorBoundary } from './RootErrorBoundary';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

describe('RootErrorBoundary', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('reports the error and offers a retry', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const retry = jest.fn(() => Promise.resolve());
    const error = new Error('boom');

    await render(<RootErrorBoundary error={error} retry={retry} />);
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeOnTheScreen();
    expect(consoleError).toHaveBeenCalledWith('[shell] unhandled render error', error);

    await fireEvent.press(screen.getByRole('button', { name: i18n.t('ui.errorState.retry') }));
    expect(retry).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
