# i18n

One i18next namespace (`translation`) whose top-level keys are the files in `locales/<lng>/`:
`common`, `ui`, `errors`, `tabs`, `auth`, `onboarding`, `legal`, `home`, `discover`, `bookings`,
`qr`, `profile`, `partner`, `subscription`, `venue`, `booking`, `reviews`, `settings`.
Address keys as `t('home.hero.title')`, i.e. `<file>.<nested.path>`; nested objects, camelCase keys.

## Adding keys

1. Add the key to `locales/ru/<file>.json`, `locales/uz/<file>.json` and `locales/en/<file>.json`
   in the same place. `parity.test.ts` fails on a key missing in any language, on empty strings,
   and on `{{variables}}` that differ between languages.
2. Plurals use i18next v4 suffixes: ru `_one/_few/_many/_other`, uz and en `_one/_other`.
   Read them with `t('common.units.visits', { count })` or `formatCount(key, count)`.
3. `{{brand}}` is always available (default variable) — never type the brand name.
4. Uzbek is Latin with modifier letters `ʻ` (U+02BB) and `ʼ` (U+02BC); the parity test rejects
   straight apostrophes in uz except `common.currency.suffix` ("so'm"). Russian uses lower-case «вы».
5. `months.*`/`weekdays.*` arrays are Monday-first; `months.long` is the form used inside dates
   (ru genitive). `dateFormats.*` patterns take `{{day}} {{month}} {{year}} {{weekday}}`.

## Runtime

- `import '@/shared/i18n'` initialises i18next synchronously from the device language;
  `await initI18n()` in the root layout applies the persisted choice (AsyncStorage `settings.locale`).
- `useLocale()` for the picker, `useFormatters()` for money/dates/phones bound to the active language,
  `createFormatters(locale)` outside React. Money and durations join number and unit with U+00A0.
- Jest: expo-localization is mocked to `en-US`, so tests start in English; switch with
  `await i18n.changeLanguage('ru')`. Any test that imports this module must mock AsyncStorage:
  `jest.mock('@react-native-async-storage/async-storage', () =>
jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'))`.
