import { NAMESPACES, resources } from './resources';
import { SUPPORTED_LOCALES, type Locale } from './types';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const INTERPOLATION = /\{\{\s*(\w+)\s*\}\}/g;
const STRAIGHT_APOSTROPHES = /['‘’`]/;

/** Keys allowed to contain a straight apostrophe in Uzbek (spec: "so'm"). */
const UZ_APOSTROPHE_ALLOWLIST = new Set(['common.currency.suffix']);

type Leaf = { key: string; value: string };

/** Flattens nested objects and arrays to dotted keys with string leaves. */
function leaves(value: unknown, path: string): Leaf[] {
  if (typeof value === 'string') return [{ key: path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leaves(item, `${path}.${index}`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`));
  }
  throw new Error(`Unsupported value at ${path}: ${String(value)}`);
}

function allLeaves(locale: Locale): Leaf[] {
  return leaves(resources[locale].translation, locale).map(({ key, value }) => ({
    key: key.slice(locale.length + 1),
    value,
  }));
}

/** Plural variants collapse onto their base key so ru (4 forms) and uz/en (2 forms) compare equal. */
function baseKey(key: string): string {
  return key.replace(PLURAL_SUFFIX, '');
}

function variables(value: string): string[] {
  return [...value.matchAll(INTERPOLATION)].map((match) => match[1] ?? '').sort();
}

const byLocale = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, allLeaves(locale)]),
) as Record<Locale, Leaf[]>;

const baseKeys = (locale: Locale) => new Set(byLocale[locale].map(({ key }) => baseKey(key)));

const otherLocales = SUPPORTED_LOCALES.filter((locale) => locale !== 'ru');

describe('locale parity', () => {
  it.each(SUPPORTED_LOCALES)('%s registers every namespace and nothing else', (locale) => {
    expect(Object.keys(resources[locale].translation).sort()).toEqual([...NAMESPACES].sort());
  });

  it.each(otherLocales)('%s has exactly the keys ru has', (locale) => {
    const ru = baseKeys('ru');
    const other = baseKeys(locale);
    expect([...ru].filter((key) => !other.has(key))).toEqual([]);
    expect([...other].filter((key) => !ru.has(key))).toEqual([]);
  });

  it.each(SUPPORTED_LOCALES)('%s has no empty strings', (locale) => {
    const empty = byLocale[locale].filter(({ value }) => value.trim() === '').map(({ key }) => key);
    expect(empty).toEqual([]);
  });

  it.each(otherLocales)('%s uses the same {{variables}} as ru', (locale) => {
    const varsByBase = (leafList: Leaf[]) => {
      const map = new Map<string, Set<string>>();
      for (const { key, value } of leafList) {
        const set = map.get(baseKey(key)) ?? new Set<string>();
        for (const name of variables(value)) set.add(name);
        map.set(baseKey(key), set);
      }
      return map;
    };
    const ru = varsByBase(byLocale.ru);
    const other = varsByBase(byLocale[locale]);
    const mismatches = [...ru.entries()]
      .filter(([key, vars]) => {
        const otherVars = other.get(key);
        return otherVars === undefined || [...vars].sort().join() !== [...otherVars].sort().join();
      })
      .map(([key]) => key);
    expect(mismatches).toEqual([]);
  });

  it('declares the plural forms each language needs', () => {
    const expected: Record<Locale, string[]> = {
      ru: ['few', 'many', 'one', 'other'],
      uz: ['one', 'other'],
      en: ['one', 'other'],
    };
    for (const locale of SUPPORTED_LOCALES) {
      const forms = new Map<string, string[]>();
      for (const { key } of byLocale[locale]) {
        const match = PLURAL_SUFFIX.exec(key);
        if (match?.[1] !== undefined) {
          forms.set(baseKey(key), [...(forms.get(baseKey(key)) ?? []), match[1]].sort());
        }
      }
      expect(forms.size).toBeGreaterThan(0);
      for (const [key, found] of forms) {
        expect({ locale, key, found }).toEqual({ locale, key, found: expected[locale] });
      }
    }
  });

  it.each(SUPPORTED_LOCALES)('%s has 12 months and 7 weekdays in both forms', (locale) => {
    const { months, weekdays } = resources[locale].translation.common;
    expect(months.short).toHaveLength(12);
    expect(months.long).toHaveLength(12);
    expect(weekdays.short).toHaveLength(7);
    expect(weekdays.long).toHaveLength(7);
  });

  it('uz uses modifier-letter apostrophes (ʻ ʼ), not straight ones', () => {
    const offenders = byLocale.uz
      .filter(
        ({ key, value }) => !UZ_APOSTROPHE_ALLOWLIST.has(key) && STRAIGHT_APOSTROPHES.test(value),
      )
      .map(({ key }) => key);
    expect(offenders).toEqual([]);
  });

  it('never spells the brand name in copy', () => {
    const offenders = SUPPORTED_LOCALES.flatMap((locale) =>
      byLocale[locale]
        .filter(({ value }) => /1heal/i.test(value))
        .map(({ key }) => `${locale}:${key}`),
    );
    expect(offenders).toEqual([]);
  });
});
