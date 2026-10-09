# Theme contract

`src/shared/theme` is the design-system foundation. Import everything from `@/shared/theme`.

## Rules

- `tokens.ts` is the only file allowed to contain color literals (`architecture.test.ts` scans
  `src/**` and `app/**` for `#hex` and `rgb(a)` and fails the build on offenders).
- Never read `lightColors`/`darkColors` directly in UI; use `useTheme().colors` so both schemes work.
- Every `on*` role is the foreground that passes WCAG AA on the role it names (`onPrimary` on
  `primary`, `onWarningBg` on `warningBg`, ...). `contrast.test.ts` enforces 4.5:1 for every
  pairing in both themes; `focusRing`, `borderStrong` and `primary` also pass 3:1 as non-text.
  `textDisabled`, `border`, `overlay` and skeleton tones are exempt by design.
- `error` and `primary` are safe as text on `background`/`surface`/`surfaceElevated`.
  `warning`/`info`/`success` are fills: put text in the matching `*Bg` + `on*Bg` pair instead.

## API

| Symbol                                                                                       | Use                                                                                |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `useTheme()`                                                                                 | `{ colors, spacing, radii, typography, elevation(level), motion, scheme, isDark }` |
| `useThemedStyles(factory)`                                                                   | memoized `StyleSheet.create(factory(theme))`; define `factory` at module scope     |
| `ThemeProvider` (`scheme?` prop forces a scheme)                                             | mount once in `app/_layout.tsx`                                                    |
| `useThemePreference()` / `useThemeStore`                                                     | preference `system`, `light` or `dark`, persisted in AsyncStorage; `hydrated` flag |
| `useAppFonts()`                                                                              | `[loaded, error]` for Inter 400/500/600/700                                        |
| `useReduceMotion()`, `usePressAnimation()`                                                   | reduce-motion aware; press spring is a no-op when on                               |
| `haptics.selection() / light / medium / success / warning / error`                           | no-op on web, never throws                                                         |
| `spacing` (4pt), `radii`, `MIN_TOUCH` (44), `typography`, `motion`, `zIndex`, `elevationFor` | raw tokens                                                                         |
| `contrastRatio`, `meetsAA`, `relativeLuminance`                                              | WCAG math for tests and tooling                                                    |

## Components

`<Text variant="body" color="textSecondary" align="center">` (`@/shared/ui/Text`) is the only text
primitive: Inter variants, theme colors, `allowFontScaling` with `maxFontSizeMultiplier` 1.6, and
every RN `Text` prop. Do not use `react-native`'s `Text` in features.
