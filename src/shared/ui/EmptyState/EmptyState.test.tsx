import { fireEvent, render, screen } from '@testing-library/react-native';
import { Inbox } from 'lucide-react-native';
import { StyleSheet, Text as RNText } from 'react-native';

import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, type ColorScheme } from '@/shared/theme/tokens';
import { iconTestID } from '@/shared/ui/gallery/testing/lucideMock';

import { EmptyState, type EmptyStateProps } from './EmptyState';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);

const ILLUSTRATION = 'illustration';

function renderState(props: Partial<EmptyStateProps> = {}, scheme: ColorScheme = 'light') {
  return render(
    <ThemeProvider scheme={scheme}>
      <EmptyState testID="empty" {...props} />
    </ThemeProvider>,
  );
}

describe('EmptyState', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('falls back to the default title and renders no actions', async () => {
    await renderState();
    expect(screen.getByRole('header', { name: 'Nothing here yet' })).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('empty-icon', { includeHiddenElements: true })).toBeNull();
  });

  it('renders title, body, a tinted icon and both actions', async () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    await renderState({
      icon: Inbox,
      title: 'No bookings',
      body: 'Your bookings will appear here.',
      primaryAction: { label: 'Find a venue', onPress: onPrimary },
      secondaryAction: { label: 'Learn more', onPress: onSecondary },
    });
    expect(screen.getByRole('header', { name: 'No bookings' })).toBeOnTheScreen();
    expect(screen.getByText('Your bookings will appear here.')).toBeOnTheScreen();
    expect(
      screen.getByTestId(iconTestID('Inbox'), { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('empty-icon', { includeHiddenElements: true }).props.style,
      ),
    ).toMatchObject({
      backgroundColor: lightColors.primarySubtle,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Find a venue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Learn more' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('prefers a custom illustration over the icon circle', async () => {
    await renderState({ icon: Inbox, illustration: <RNText>{ILLUSTRATION}</RNText> });
    expect(screen.getByText(ILLUSTRATION)).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-icon', { includeHiddenElements: true })).toBeNull();
  });

  it.each<[ColorScheme, string]>([
    ['light', lightColors.errorBg],
    ['dark', darkColors.errorBg],
  ])('tints the error tone with the %s errorBg token', async (scheme, color) => {
    await renderState({ icon: Inbox, tone: 'error', accessibilityLiveRegion: 'polite' }, scheme);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('empty-icon', { includeHiddenElements: true }).props.style,
      ).backgroundColor,
    ).toBe(color);
    expect(screen.getByTestId('empty').props.accessibilityLiveRegion).toBe('polite');
  });
});
