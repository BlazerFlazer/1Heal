import AsyncStorage from '@react-native-async-storage/async-storage';

import { localeSchema, type Locale } from './types';

/** AsyncStorage key holding the language the user picked explicitly. */
export const LOCALE_STORAGE_KEY = 'settings.locale';

/** The persisted choice, or null when nothing valid is stored or storage is unavailable. */
export async function readStoredLocale(): Promise<Locale | null> {
  try {
    const parsed = localeSchema.safeParse(await AsyncStorage.getItem(LOCALE_STORAGE_KEY));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Remembers the choice for the next launch. Best effort: the language is already active. */
export async function writeStoredLocale(locale: Locale): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage failures must not break language switching.
  }
}
