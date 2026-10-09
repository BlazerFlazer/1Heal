# Component library (`src/shared/ui`)

One folder per component, imported by folder: `import { Button } from '@/shared/ui/Button'`.
There is no root barrel on purpose (keeps Metro bundles and test graphs small).

Each folder holds `Component.tsx`, `index.ts` (public exports) and `Component.test.tsx` (RNTL
behaviour tests rendered inside `ThemeProvider` in both schemes). Helpers that grow past ~250
lines are split into sibling files (`buttonTheme.ts`, `fieldStyles.ts`, `initials.ts`, ...).

Rules every component follows: colors/spacing/radii/typography only from `useTheme()`; every
control has `accessibilityRole`, a label and a 44pt hit target (`hitSlop` when the visual is
smaller); animations go through `@/shared/theme/motion` and respect reduce-motion; no user-facing
strings are baked in — callers pass `t(...)` results as props.

## Components

| Component                      | Key props                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PressableScale` (`Pressable`) | Base animated pressable: spring scale on press, `hapticsEnabled` (selection), `scale`, `dimWhenDisabled`, `disabled` state exposed; ripple off. Also exports `DISABLED_OPACITY`.                                                                                                                       |
| `Button`                       | `label`, `onPress`, `variant` primary/secondary/outline/ghost/destructive, `size` sm/md/lg (40/48/56), `loading` (spinner keeps width, blocks presses, `busy`), `disabled`, `leftIcon`/`rightIcon` (lucide), `fullWidth`, `haptic` light/success/none.                                                 |
| `IconButton`                   | `icon` (lucide), required `accessibilityLabel`, `variant` ghost/filled/primary/outline, `size` md (44)/lg (56), `iconColor` role, `hapticsEnabled` (default on).                                                                                                                                       |
| `Input`                        | `label`, `value`/`onChangeText`, `placeholder`, `helperText`, `errorText` (error color + polite live region), `leftIcon`, `rightSlot`, `secureTextEntry` + `secureToggleLabels {show,hide}`, `clearable` + required `clearLabel`, `disabled`, `ref`, any `TextInput` prop. Focus ring uses `outline*`. |
| `OTPInput`                     | `value`, `onChange`, `onComplete`, `length` (6), `autoFocus`, `error` (shake), `disabled`, required `accessibilityLabel`. One hidden autofill-ready `TextInput` + visual cells; paste works. Exports `sanitizeOtp`.                                                                                    |
| `Card`                         | `radius` md/lg, `elevation` 0..3, `padding` spacing key (default 4), optional `onPress` (becomes a button), `disabled`, `accessibilityLabel`/`Hint`.                                                                                                                                                   |
| `Chip`                         | Filter chip: `label`, `selected` (a11y state), `onPress`, `leftIcon`, `size` sm/md (32/40, hit area padded to 44).                                                                                                                                                                                     |
| `Badge`                        | `tone` success/warning/error/info/neutral/primary, `size` sm/md, `label` or `count` (+ `max`, default 99 → "99+"), `dot`, `accessibilityLabel` (a dot without one is hidden from a11y).                                                                                                                |
| `Avatar`                       | `uri` (expo-image over a tinted placeholder, optional `blurhash`), `name` → two initials (Cyrillic-safe), `size` sm/md/lg/xl (32/40/48/64), required `accessibilityLabel`. Exports `initialsFor`.                                                                                                      |
| `PriceTag`                     | `amountUzs` (integer UZS, formatted via `formatMoney` for the active locale), `oldAmountUzs` (struck through), `period` suffix (caller passes `t('ui.priceTag.perMonth')`), `size` sm/md/lg, `accessibilityLabel` override.                                                                            |
| `Rating`                       | `value` 0..5 (half stars in display), `onChange` makes it interactive (`adjustable` role with increment/decrement actions, taps set whole stars), `readOnly`, `size` sm/md/lg, required `accessibilityLabel`, `valueText`. Exports `clampRating`.                                                      |
| `Divider`                      | `orientation` horizontal/vertical, `inset` spacing key, `color` role. Hidden from a11y (`role="separator"`).                                                                                                                                                                                           |
| `Text`                         | Owned by the theme: `variant`, `color`, `align`; see `src/shared/theme/README.md`.                                                                                                                                                                                                                     |

## Testing notes

RNTL v14: `render`, `fireEvent.*` and `act` are async — await them. Tests that import the theme
store or i18n must mock AsyncStorage with the `jest/async-storage-mock`. Mock `@/shared/theme/haptics`
to assert haptics without `expo-haptics`.
