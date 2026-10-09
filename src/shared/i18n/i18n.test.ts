import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales, type Locale as DeviceLocale } from 'expo-localization';

import { BRAND_NAME } from '@/shared/config/brand';

import { detectDeviceLocale, pickLocaleFromTags } from './detectLocale';
import { changeLocale, getCurrentLocale, i18n, initI18n } from './i18n';
import { LOCALE_STORAGE_KEY } from './localeStorage';
import { parseLocaleTag, SUPPORTED_LOCALES, toLocale } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'en-US', languageCode: 'en' }]),
}));

const mockedGetLocales = jest.mocked(getLocales);

/** A device locale entry with only the fields detection reads filled in. */
function device(languageTag: string, languageCode: string | null): DeviceLocale {
  return {
    languageTag,
    languageCode,
    languageScriptCode: null,
    regionCode: null,
    languageRegionCode: null,
    currencyCode: null,
    currencySymbol: null,
    languageCurrencyCode: null,
    languageCurrencySymbol: null,
    decimalSeparator: null,
    digitGroupingSeparator: null,
    textDirection: 'ltr',
    measurementSystem: null,
    temperatureUnit: null,
  };
}

describe('language detection', () => {
  it.each<[readonly (string | null)[], string]>([
    [['ru-RU'], 'ru'],
    [['uz-Latn-UZ'], 'uz'],
    [['uz-Cyrl-UZ'], 'uz'],
    [['uz'], 'uz'],
    [['en-GB'], 'en'],
    [['kk-KZ', 'ru-RU'], 'ru'],
    [['tr-TR'], 'en'],
    [['de-DE', 'fr-FR'], 'en'],
    [[null, 'UZ_uz'], 'uz'],
    [[], 'ru'],
  ])('%j → %s', (tags, expected) => {
    expect(pickLocaleFromTags(tags)).toBe(expected);
  });

  it('parses the language out of any tag shape', () => {
    expect(parseLocaleTag('uz-Cyrl')).toBe('uz');
    expect(parseLocaleTag('RU')).toBe('ru');
    expect(parseLocaleTag(' en_US ')).toBe('en');
    expect(parseLocaleTag('zh-Hans')).toBeNull();
    expect(parseLocaleTag('')).toBeNull();
    expect(parseLocaleTag(undefined)).toBeNull();
    expect(toLocale('xx')).toBe('ru');
    expect(toLocale('xx', 'en')).toBe('en');
    expect(toLocale('uz-Cyrl-UZ')).toBe('uz');
  });

  it('reads the device preference list in order', () => {
    mockedGetLocales.mockReturnValueOnce([device('uz-Cyrl-UZ', 'uz')]);
    expect(detectDeviceLocale()).toBe('uz');
    mockedGetLocales.mockReturnValueOnce([device('tr-TR', 'tr'), device('ru-RU', 'ru')]);
    expect(detectDeviceLocale()).toBe('ru');
    mockedGetLocales.mockReturnValueOnce([device('fr-FR', 'fr')]);
    expect(detectDeviceLocale()).toBe('en');
  });

  it('uses the language tag when the language code is missing', () => {
    mockedGetLocales.mockReturnValueOnce([device('ru-RU', null)]);
    expect(detectDeviceLocale()).toBe('ru');
  });

  it('falls back to Russian when the native module throws', () => {
    mockedGetLocales.mockImplementationOnce(() => {
      throw new Error('native module unavailable');
    });
    expect(detectDeviceLocale()).toBe('ru');
  });
});

describe('i18n instance', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('is initialised synchronously in the device language', () => {
    expect(i18n.isInitialized).toBe(true);
    mockedGetLocales.mockReturnValueOnce([device('uz-Latn-UZ', 'uz')]);
    let fresh: typeof import('./i18n') | undefined;
    jest.isolateModules(() => {
      fresh = jest.requireActual<typeof import('./i18n')>('./i18n');
    });
    expect(fresh?.i18n.isInitialized).toBe(true);
    expect(fresh?.getCurrentLocale()).toBe('uz');
    expect(fresh?.i18n.t('common.actions.continue')).toBe('Davom etish');
  });

  it('substitutes the brand as a default variable in every language', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(i18n.t('common.appName', { lng: locale })).toBe(BRAND_NAME);
    }
  });

  it('interpolates without escaping and resolves JSON v4 plurals', () => {
    expect(i18n.t('ui.otp.label', { index: 2, total: 6 })).toBe('Digit 2 of 6');
    expect(i18n.t('ui.priceTag.from', { price: '<b>' })).toBe('from <b>');
    expect(i18n.t('common.units.visits', { count: 21, lng: 'ru' })).toBe('21 посещение');
    expect(i18n.t('common.units.visits', { count: 3, lng: 'ru' })).toBe('3 посещения');
    expect(i18n.t('common.units.visits', { count: 0, lng: 'ru' })).toBe('0 посещений');
    expect(i18n.t('common.units.visits', { count: 0, lng: 'en' })).toBe('0 visits');
  });

  it('falls back to Russian for a key missing elsewhere and never returns null', () => {
    i18n.addResource('ru', 'translation', 'test.onlyRu', 'только по-русски');
    expect(i18n.t('test.onlyRu', { lng: 'en' })).toBe('только по-русски');
    expect(i18n.t('test.missing.key')).toBe('test.missing.key');
  });

  it('always reports a supported locale', async () => {
    await i18n.changeLanguage('ru');
    expect(getCurrentLocale()).toBe('ru');
    await i18n.changeLanguage('de');
    expect(getCurrentLocale()).toBe('ru');
  });

  it('changeLocale switches and persists; initI18n restores the choice', async () => {
    await changeLocale('uz');
    expect(getCurrentLocale()).toBe('uz');
    expect(i18n.t('common.actions.retry')).toBe('Qayta urinish');
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uz');

    await i18n.changeLanguage('en');
    await initI18n();
    expect(getCurrentLocale()).toBe('uz');
  });

  it('initI18n keeps the device language when nothing valid is stored', async () => {
    await initI18n();
    expect(getCurrentLocale()).toBe('en');
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'de');
    await initI18n();
    expect(getCurrentLocale()).toBe('en');
  });

  it('survives storage failures on both read and write', async () => {
    const read = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('down'));
    await expect(initI18n()).resolves.toBeUndefined();
    expect(getCurrentLocale()).toBe('en');
    const write = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('down'));
    await expect(changeLocale('ru')).resolves.toBeUndefined();
    expect(getCurrentLocale()).toBe('ru');
    read.mockRestore();
    write.mockRestore();
  });
});
