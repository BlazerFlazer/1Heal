import { useTranslation } from 'react-i18next';

import { changeLocale } from './i18n';
import { LOCALE_OPTIONS, toLocale, type Locale, type LocaleOption } from './types';

export type UseLocaleResult = {
  /** Language currently rendered. */
  locale: Locale;
  /** Switches the language and persists the choice. */
  setLocale: (locale: Locale) => Promise<void>;
  /** Picker entries, each named in its own language. */
  locales: readonly LocaleOption[];
};

/** Current UI language plus a persisting setter. Re-renders when the language changes. */
export function useLocale(): UseLocaleResult {
  const { i18n } = useTranslation();
  return {
    locale: toLocale(i18n.resolvedLanguage ?? i18n.language),
    setLocale: changeLocale,
    locales: LOCALE_OPTIONS,
  };
}
