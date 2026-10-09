import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { i18n } from './i18n';
import { LOCALE_STORAGE_KEY } from './localeStorage';
import { useLocale } from './useLocale';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useLocale', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('exposes the current language and the picker options in their own language', async () => {
    const { result } = await renderHook(() => useLocale());
    expect(result.current.locale).toBe('en');
    expect(result.current.locales.map((option) => option.code)).toEqual(['ru', 'uz', 'en']);
    expect(result.current.locales.map((option) => option.nativeName)).toEqual([
      'Русский',
      'Oʻzbekcha',
      'English',
    ]);
  });

  it('switches the language, re-renders and persists the choice', async () => {
    const { result } = await renderHook(() => useLocale());
    await act(async () => {
      await result.current.setLocale('uz');
    });
    expect(result.current.locale).toBe('uz');
    expect(i18n.t('common.actions.continue')).toBe('Davom etish');
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uz');
  });

  it('reflects language changes made outside the hook', async () => {
    const { result } = await renderHook(() => useLocale());
    await act(async () => {
      await i18n.changeLanguage('ru');
    });
    expect(result.current.locale).toBe('ru');
  });
});
