import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { useThemeStore } from '@/shared/theme/themeStore';
import { darkColors, lightColors, motion, radii, spacing, typography } from '@/shared/theme/tokens';

import { Avatar } from './Avatar';
import { initialsFor } from './initials';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const label = 'Avatar of Olim';
const uri = 'https://example.com/avatar.jpg';

function renderDark(ui: React.ReactElement) {
  useThemeStore.setState({ preference: 'dark' });
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('initialsFor', () => {
  it('builds two upper-case letters from Latin and Cyrillic names', () => {
    expect(initialsFor('Olim Abdullaev')).toBe('OA');
    expect(initialsFor('Олим Абдуллаев')).toBe('ОА');
    expect(initialsFor('  oybek  ')).toBe('OY');
    expect(initialsFor('Oʻtkir')).toBe('Oʻ');
    expect(initialsFor('Анна Мария Ли')).toBe('АМ');
    expect(initialsFor('Ж')).toBe('Ж');
  });

  it('returns an empty string for missing or blank names', () => {
    expect(initialsFor(undefined)).toBe('');
    expect(initialsFor('')).toBe('');
    expect(initialsFor('   ')).toBe('');
  });
});

describe('Avatar', () => {
  it('renders initials on the tinted dark placeholder as a labelled image', async () => {
    await renderDark(<Avatar name="Олим Абдуллаев" accessibilityLabel={label} testID="a" />);
    const avatar = screen.getByRole('image', { name: label });
    expect(avatar).toHaveStyle({
      width: spacing[10],
      height: spacing[10],
      borderRadius: radii.full,
      backgroundColor: darkColors.primarySubtle,
    });
    expect(screen.getByText('ОА')).toHaveStyle({
      color: darkColors.onPrimarySubtle,
      fontSize: typography.bodyStrong.fontSize,
    });
    expect(screen.queryByTestId('a-image')).toBeNull();
  });

  it('renders an expo-image for a uri with cover fit, transition and recycling key', async () => {
    await render(
      <ThemeProvider scheme="light">
        <Avatar
          uri={uri}
          name="Olim"
          blurhash="LEHV6nWB2yk8"
          accessibilityLabel={label}
          testID="a"
        />
      </ThemeProvider>,
    );
    const image = screen.getByTestId('a-image');
    expect(image.props.source).toEqual(expect.arrayContaining([expect.objectContaining({ uri })]));
    expect(image.props.contentFit).toBe('cover');
    expect(image.props.recyclingKey).toBe(uri);
    expect(image.props.placeholder).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uri: expect.stringContaining('LEHV6nWB2yk8') }),
      ]),
    );
    expect(image.props.transition).toEqual(
      expect.objectContaining({ duration: motion.durations.base }),
    );
    expect(screen.queryByText('OL')).toBeNull();
    expect(screen.getByTestId('a')).toHaveStyle({ backgroundColor: lightColors.primarySubtle });
  });

  it('scales sm / lg / xl and their text variants', async () => {
    await renderDark(
      <>
        <Avatar name="Olim" size="sm" accessibilityLabel={label} testID="sm" />
        <Avatar name="Olim" size="lg" accessibilityLabel={label} testID="lg" />
        <Avatar name="Olim" size="xl" accessibilityLabel={label} testID="xl" />
      </>,
    );
    expect(screen.getByTestId('sm')).toHaveStyle({ width: spacing[8] });
    expect(screen.getByTestId('lg')).toHaveStyle({ width: spacing[12] });
    expect(screen.getByTestId('xl')).toHaveStyle({ width: spacing[16] });
    const sizes = screen.getAllByText('OL').map((node) => node.props.style);
    expect(sizes[0]).toContainEqual(
      expect.objectContaining({ fontSize: typography.label.fontSize }),
    );
    expect(sizes[2]).toContainEqual(
      expect.objectContaining({ fontSize: typography.title.fontSize }),
    );
  });

  it('falls back to a person icon without uri or name', async () => {
    await renderDark(<Avatar accessibilityLabel={label} testID="a" />);
    expect(screen.getByTestId('a').children).toHaveLength(1);
    expect(screen.queryByText(/./)).toBeNull();
    expect(screen.queryByTestId('a-image')).toBeNull();
  });
});
