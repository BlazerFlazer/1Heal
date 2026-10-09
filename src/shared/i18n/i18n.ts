import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { BRAND_NAME } from '@/shared/config/brand';

import { detectDeviceLocale } from './detectLocale';
import { readStoredLocale, writeStoredLocale } from './localeStorage';
import { resources } from './resources';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, toLocale, type Locale } from './types';

/**
 * The app-wide i18next instance: a dedicated one (not the library global), so
 * nothing else can reconfigure it behind our back. Importing this module
 * initialises it synchronously — resources are bundled and `initAsync: false`
 * (i18next 26's name for the former `initImmediate: false`) skips the deferred
 * load — so `t()` works from the very first render. Call `initI18n()` once at
 * app start to apply the persisted language choice.
 */
export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  initAsync: false,
  returnNull: false,
  // JSON v4 plural suffixes (_one/_few/_many/_other), resolved with Intl.PluralRules.
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
    defaultVariables: { brand: BRAND_NAME },
  },
  react: { useSuspense: false },
});

/** The locale i18next is currently rendering (always one of the supported ones). */
export function getCurrentLocale(): Locale {
  return toLocale(i18n.resolvedLanguage ?? i18n.language);
}

/** Switches the UI language and remembers the choice for the next launch. */
export async function changeLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  await writeStoredLocale(locale);
}

/**
 * Applies the language the user chose earlier (persisted in AsyncStorage) on
 * top of the device language picked at import time. Resolves without throwing
 * when storage is unavailable; call it once from the root layout.
 */
export async function initI18n(): Promise<void> {
  const stored = await readStoredLocale();
  if (stored !== null && stored !== getCurrentLocale()) {
    await i18n.changeLanguage(stored);
  }
}
