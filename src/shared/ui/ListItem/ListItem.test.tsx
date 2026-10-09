import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Switch, Text as RNText } from 'react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { darkColors, lightColors, type ColorScheme } from '@/shared/theme/tokens';

import { LIST_ITEM_MIN_HEIGHT, ListItem, type ListItemProps } from './ListItem';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);

function renderItem(props: Partial<ListItemProps> = {}, scheme: ColorScheme = 'light') {
  return render(
    <ThemeProvider scheme={scheme}>
      <ListItem testID="item" title="Pulse Fitness" {...props} />
    </ThemeProvider>,
  );
}

describe('ListItem', () => {
  it('renders title, subtitle and trailing text as one accessible row', async () => {
    await renderItem({ subtitle: 'Yunusabad', trailingText: '1.2 km' });
    const row = screen.getByTestId('item');
    expect(row.props.accessible).toBe(true);
    expect(row.props.accessibilityLabel).toBe('Pulse Fitness, Yunusabad, 1.2 km');
    expect(screen.getByText('Yunusabad')).toBeOnTheScreen();
    expect(screen.getByText('1.2 km')).toBeOnTheScreen();
    expect(StyleSheet.flatten(row.props.style).minHeight).toBe(LIST_ITEM_MIN_HEIGHT);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('becomes a button with a chevron when pressable', async () => {
    const onPress = jest.fn();
    await renderItem({ onPress, accessibilityHint: 'Opens the venue' });
    const button = screen.getByRole('button', { name: 'Pulse Fitness' });
    expect(button.props.accessibilityHint).toBe('Opens the venue');
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled and exposes the disabled state', async () => {
    const onPress = jest.fn();
    await renderItem({ onPress, disabled: true });
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps a custom trailing control individually accessible', async () => {
    await renderItem({ trailing: <Switch testID="switch" value onValueChange={jest.fn()} /> });
    expect(screen.getByTestId('item').props.accessible).toBe(false);
    expect(screen.getByTestId('switch')).toBeOnTheScreen();
  });

  it('renders the leading slot', async () => {
    const leadingText = 'icon';
    await renderItem({ leading: <RNText>{leadingText}</RNText> });
    expect(screen.getByText(leadingText)).toBeOnTheScreen();
  });

  it.each<[ColorScheme, string]>([
    ['light', lightColors.border],
    ['dark', darkColors.border],
  ])('draws the %s divider with the border token', async (scheme, color) => {
    await renderItem({ divider: true }, scheme);
    expect(StyleSheet.flatten(screen.getByTestId('item').props.style)).toMatchObject({
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color,
    });
  });
});
