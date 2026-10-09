import { getLocales } from 'expo-localization';

import { DEFAULT_LOCALE, parseLocaleTag, type Locale } from './types';

/** Shown to people whose device languages we do not ship. */
const FOREIGN_FALLBACK: Locale = 'en';

/**
 * Picks the first supported language from a device preference list
 * (most preferred first). A list with no supported language gives English;
 * an empty list gives the product default.
 */
export function pickLocaleFromTags(tags: readonly (string | null | undefined)[]): Locale {
  if (tags.length === 0) return DEFAULT_LOCALE;
  for (const tag of tags) {
    const locale = parseLocaleTag(tag);
    if (locale !== null) return locale;
  }
  return FOREIGN_FALLBACK;
}

/**
 * Device language mapped to a supported locale. Never throws: app start must
 * not depend on the native localization module being present (web, tests).
 */
export function detectDeviceLocale(): Locale {
  try {
    const tags = getLocales().map((locale) => locale.languageCode ?? locale.languageTag);
    return pickLocaleFromTags(tags);
  } catch {
    return DEFAULT_LOCALE;
  }
}
