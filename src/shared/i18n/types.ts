import { z } from 'zod';

/** Languages the app ships, in the order the language picker shows them. */
export const SUPPORTED_LOCALES = ['ru', 'uz', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Russian is the product default and the fallback for missing keys. */
export const DEFAULT_LOCALE: Locale = 'ru';

export const localeSchema = z.enum(SUPPORTED_LOCALES);

export type LocaleOption = { code: Locale; nativeName: string };

/** Language names are shown in their own language, so they are never translated. */
export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { code: 'ru', nativeName: 'Русский' },
  { code: 'uz', nativeName: 'Oʻzbekcha' },
  { code: 'en', nativeName: 'English' },
];

export function isLocale(value: unknown): value is Locale {
  return localeSchema.safeParse(value).success;
}

/**
 * Reads the language out of any BCP 47 tag ('uz-Cyrl-UZ', 'ru_RU', 'en').
 * Uzbek Cyrillic maps to the Latin 'uz' until a Cyrillic locale ships.
 * Returns null for languages the app does not ship.
 */
export function parseLocaleTag(tag: string | null | undefined): Locale | null {
  const language = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(language) ? language : null;
}

/** Like `parseLocaleTag`, but falls back to `fallback` for unsupported or empty tags. */
export function toLocale(
  tag: string | null | undefined,
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  return parseLocaleTag(tag) ?? fallback;
}
