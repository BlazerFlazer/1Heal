import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as RNText } from 'react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, MIN_TOUCH, type ColorScheme } from '@/shared/theme/tokens';

import { Section } from './Section';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const CONTENT = 'content';

function renderSection(scheme: ColorScheme, onPress?: () => void) {
  return render(
    <ThemeProvider scheme={scheme}>
      <Section
        testID="section"
        title="Nearby"
        action={
          onPress ? { label: 'See all', onPress, accessibilityLabel: 'See all venues' } : undefined
        }
      >
        <RNText>{CONTENT}</RNText>
      </Section>
    </ThemeProvider>,
  );
}

describe('Section', () => {
  it('renders a header title and its children', async () => {
    await renderSection('light');
    expect(screen.getByRole('header', { name: 'Nearby' })).toBeOnTheScreen();
    expect(screen.getByText(CONTENT)).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the action as an accessible button with a 44pt target', async () => {
    const onPress = jest.fn();
    await renderSection('light', onPress);
    const action = screen.getByRole('button', { name: 'See all venues' });
    await fireEvent.press(action);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(screen.getByTestId('section-action').props.style)).toMatchObject({
      minHeight: MIN_TOUCH,
      minWidth: MIN_TOUCH,
    });
  });

  it.each<[ColorScheme, string]>([
    ['light', lightColors.primary],
    ['dark', darkColors.primary],
  ])('colors the action label with the %s primary', async (scheme, color) => {
    await renderSection(scheme, jest.fn());
    expect(StyleSheet.flatten(screen.getByText('See all').props.style).color).toBe(color);
  });
});
