/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react-native';

import { BRAND_NAME } from '@/shared/config/brand';

import { Logo } from './Logo';
import { LogoMark } from './LogoMark';
import { MARK_PATH } from './markPath';

// The theme store persists to AsyncStorage, whose native module is absent under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('LogoMark', () => {
  it('renders an image announced as the brand name', async () => {
    await render(<LogoMark size={32} color="green" testID="logo-mark" />);

    const mark = screen.getByTestId('logo-mark');
    expect(mark.props.accessibilityLabel).toBe(BRAND_NAME);
    expect(mark.props.accessibilityRole).toBe('image');
  });

  it('is found by its accessibility label', async () => {
    await render(<LogoMark color="green" />);

    expect(screen.getByLabelText(BRAND_NAME)).toBeTruthy();
  });

  it('keeps the path in sync with assets/brand/mark.svg', () => {
    const svg = readFileSync(resolve(process.cwd(), 'assets/brand/mark.svg'), 'utf8');

    expect(svg).toContain(`d="${MARK_PATH}"`);
  });
});

describe('Logo', () => {
  it('renders the mark alone by default', async () => {
    await render(<Logo testID="logo" />);

    expect(screen.getByTestId('logo').props.accessibilityLabel).toBe(BRAND_NAME);
    expect(screen.queryByText(BRAND_NAME)).toBeNull();
  });

  it('adds the wordmark in the lockup variant', async () => {
    await render(<Logo variant="lockup" size={40} />);

    expect(screen.getByText(BRAND_NAME)).toBeTruthy();
    expect(screen.getByLabelText(BRAND_NAME)).toBeTruthy();
  });
});
