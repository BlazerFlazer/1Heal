# Decisions (ADR log, append only)

Format: context → options → decision → consequences. Dates are absolute.

## ADR-001 (2026-10-08) Expo SDK 57 default template, routes in `app/` at repo root

Context: SDK 57 is the current stable (React Native 0.86, React 19.2, TypeScript 6). The default
template places routes in `src/app`. The product spec asks for `/app` at the root.
Options: keep `src/app` (template default) or `app/` at root (spec).
Decision: `app/` at root, `src/` for everything else, aliases `@/* → src/*`. Expo Router resolves
`app/` before `src/app/`.
Consequences: thin route files that import feature screens; `src/app` from the template is deleted.

## ADR-002 (2026-10-08) npm as package manager; admin app is a separate package

Context: EAS and the Expo template default to npm with a lockfile. Admin (`apps/admin`) is a Next.js
app with its own React version requirements.
Options: npm workspaces monorepo; pnpm workspaces; separate packages.
Decision: root = mobile app with npm; `apps/admin` is its own npm package with its own lockfile and
is excluded from Metro via `metro.config.js` blockList.
Consequences: no hoisting conflicts between React Native and Next.js; shared code (domain rules,
zod schemas) is published inside the repo via a `packages/`-free path alias only when needed.

## ADR-003 (2026-10-08) Phone OTP through Supabase Auth with a custom "Send SMS" hook

Context: Supabase Auth phone OTP supports only a few global SMS providers; Uzbekistan uses Eskiz.
Options: (a) fully custom OTP tables + custom JWT minting; (b) Supabase Auth phone OTP with the
"Send SMS" auth hook pointing at an Edge Function that calls an `SmsProvider` adapter.
Decision: (b). Supabase keeps session issuance, refresh-token rotation, rate limiting and OTP
hashing; the Edge Function only delivers the code via `EskizSmsProvider` or `MockSmsProvider`.
Consequences: in dev without Supabase the app runs a `MockAuthService` (code `123456`, resend timer
and lockout simulated) selected by `EXPO_PUBLIC_AUTH_PROVIDER=mock`. Supabase local config adds
`[auth.sms.test_otp]` numbers for CI. Extra per-phone/IP limits are enforced in the hook via
`sms_send_log`.

## ADR-004 (2026-10-08) Single type family: Inter

Context: spec allows Inter or Manrope. Both support Cyrillic and Uzbek Latin diacritics (ʻ, oʻ, gʻ).
Decision: Inter only (400/500/600/700) via `@expo-google-fonts/inter` + `useFonts`, with the
splash screen held until fonts load. Fewer assets, consistent rhythm, better Cyrillic hinting.

## ADR-005 (2026-10-08) Offline persistence with AsyncStorage, tokens in SecureStore

Options: MMKV (fast, native, not in Expo Go) vs AsyncStorage (in Expo Go, slower).
Decision: AsyncStorage for TanStack Query persistence and Zustand UI state; expo-secure-store for
session tokens and the QR token window. Keeps M1 runnable in Expo Go; MMKV can replace the storage
adapter later behind the same interface.

## ADR-006 (2026-10-08) Icons: lucide-react-native over @expo/vector-icons

Decision: lucide (tree-shakable SVG, consistent stroke style, matches the calm/clean brand). The
logo is an original SVG mark rendered with react-native-svg.

## ADR-007 (2026-10-08) Web is a developer preview target only

Context: no simulators on the authoring machine; the Expo web target lets screens be verified in a
browser. Decision: keep `react-native-web` and `expo start --web` for previews and visual checks;
web is not a shipped product. Native-only modules get `.web.ts` fallbacks or runtime guards.

## ADR-008 (2026-10-08) Testing stack

Unit/component: Jest (`jest-expo` preset) + @testing-library/react-native. Architecture tests
(no hex colors outside tokens, no cross-feature imports, no raw JSX strings) run in Jest.
DB: pgTAP in `supabase/tests`. E2E: Maestro YAML flows in `e2e/` (run in CI on a simulator).

## ADR-009 (2026-10-08) Maps default: Yandex, decided in M3 after a compatibility spike

Yandex has better POI/address coverage in Uzbekistan; the React Native binding compatibility with
RN 0.86 + New Architecture must be verified. The map layer is an interface
(`src/services/maps/MapProvider.ts`) with `YandexMapAdapter` and `GoogleMapAdapter`; the default is
selected by feature flag. Final choice and justification recorded in M3.

## ADR-010 (2026-10-08) Design tokens: one token table, contrast-tested, persisted theme preference

Context: colours, spacing, radii, typography and motion must be the only source of visual constants
(an architecture test rejects colour literals elsewhere), and both themes must meet WCAG AA.
Options: (a) one `tokens.ts` with semantic `ThemeColors` per scheme; (b) styled-system / Tamagui;
(c) per-component colour props.
Decision: (a). `src/shared/theme/tokens.ts` holds the palette and the semantic light/dark colour
maps; `contrast.test.ts` asserts 4.5:1 for every on-colour/fill pair (no reliance on the large-text
exemption) and 3:1 for focus ring, strong border and primary as non-text contrast; disabled text,
borders, overlay and skeleton tones are exempt as inactive/decorative. Elevation is a function of
the theme (`Platform.select`: `boxShadow` on web, shadow + elevation natively). The user preference
(`system | light | dark`) lives in a zustand store persisted to AsyncStorage and zod-validated on
rehydrate; an invalid value falls back to `system` and `hydrated` flips true even on storage errors.
RN 0.86's `useColorScheme()` can return `'unspecified'`; it is treated as light.
Consequences: `getTheme(scheme)` returns a stable object so navigation themes and memoised style
factories do not churn; `tokens.ts` is slightly over the 250-line guideline but stays one table.

## ADR-011 (2026-10-08) i18n: one namespace with file-prefixed keys, dedicated i18next instance, no Intl

Context: three locales (ru default, uz Latin, en), Hermes on Android may lack `Intl` data for `uz`,
and strings must never flash in the wrong language at start-up.
Options: real i18next namespaces per file vs one `translation` namespace keyed `file.path.key`;
the global i18next default export vs `createInstance()`; `Intl.DateTimeFormat`/`NumberFormat` vs
hand-rolled formatters.
Decision: one namespace whose top-level sections equal the locale file names
(`t('common.actions.continue')`), parity enforced by `parity.test.ts`; a dedicated instance
exported as `i18n` from `@/shared/i18n` (no third-party module can reconfigure it, no
`import/no-named-as-default-member` lint noise); synchronous init at import with bundled resources
(`initAsync: false`, the i18next 26 name) and `initI18n()` applying the persisted choice
afterwards. Device language: first supported entry of `getLocales()`, `uz-Cyrl` → `uz`, unsupported
→ `en`, empty/failed → `ru`. Dates and money are formatted from tables in `common.json`
(24-hour time, U+00A0 thousands separator, U+2212 minus, integer UZS); plurals use JSON v4 suffix
keys (ru `_one/_few/_many/_other`, uz/en `_one/_other`) resolved by `Intl.PluralRules`.
Consequences: identical output on iOS/Android/web; the date layer uses the device time zone (a
venue-time-zone layer is a later task); if a Hermes build lacks `Intl.PluralRules` for `ru`, add
the `intl-pluralrules` polyfill (verify on a real Android build in CI). Tests importing
`@/shared/i18n` mock AsyncStorage explicitly; no implicit `__mocks__` directory.

## ADR-012 (2026-10-08) Brand mark: single even-odd SVG path, mark-only raster assets

Context: the logo must work in one colour on any background, in Android monochrome and in the
splash screen before the theme provider mounts.
Options: leaf + separate plus shape; one path with the plus as negative space; runtime `.svg`
import through a Metro transformer.
Decision: one even-odd path (the plus-shaped vein is a hole), the single source of truth in
`assets/brand/mark.svg`, mirrored verbatim in `src/shared/brand/markPath.ts` with a test that fails
on drift. Raster assets (icon, adaptive, monochrome, splash, favicon) are generated by
`scripts/generate-assets.mjs` with resvg and `loadSystemFonts: false`, mark only; the `1Heal`
wordmark is rendered in React from `BRAND_NAME` (Inter Bold). `LogoMark` takes a required colour
and has no theme dependency; `Logo` wraps it for in-app use.
Consequences: deterministic PNGs across machines; icon padding (18 %) and the Android safe zone are
computed from the mark's real bounding box; the dark splash reuses the green-700 mark on
`#0B1511` (a brighter dark-mode variant would need a second PNG in `app.json`).

## ADR-013 (2026-10-08) Supabase client: no URL polyfill, tokens in AsyncStorage, roles from the JWT

Context: supabase-js on React Native 0.86 and Expo SDK 57.
Options: install `react-native-url-polyfill` (legacy quickstart) vs rely on RN's own
URL/URLSearchParams; encrypted token storage now vs supabase-js default; roles from
`user.app_metadata` vs the access-token claim.
Decision: no polyfill (RN 0.86 ships complete URL classes and supabase-js 2.117 documents RN as
supported with the framework's own polyfills). Tokens are persisted by supabase-js in AsyncStorage
(`autoRefreshToken`, `persistSession`, `detectSessionInUrl: false`); the app-level device id goes to
expo-secure-store. Auto-refresh is bound to AppState on native (`startAutoRefresh` on `active`).
Roles are read exclusively from the JWT claim `app_metadata.roles` (zod-validated, default
`['member']`); the custom access-token hook that writes it from `user_roles` is an M2 deliverable.
`signOut` tries scope `global` and falls back to `local` so sign-out works offline.
Consequences: unencrypted tokens on device are a compliance flag (see `COMPLIANCE.md` §7); an
encrypted storage adapter (SecureStore-held key + AES) is evaluated in M2.
`SUPABASE_OTP_RESEND_AFTER_SEC` / `SUPABASE_OTP_EXPIRES_IN_SEC` are UI hints that must equal
`[auth.sms]` in `supabase/config.toml` once it exists.

## ADR-014 (2026-10-08) Mock auth conventions and persisted active mode

Context: the app must be fully usable offline in dev and in Expo Go, with realistic throttling.
Decision: `MockAuthService` accepts code `123456` for every valid Uzbek mobile number; numbers
ending in `00` also carry the `partner` role and `+998900000000` additionally `admin`. Limits
mirror production (30 s resend cooldown, 3 requests per 10 min, 5 wrong codes → 15 min lock, codes
expire after 5 min, 1 h sessions rotated on refresh) and surface as `AuthError` codes with
`retryAfterSec`. `activeMode` (`member | partner`) is persisted explicitly through `appStorage`
inside the auth store (not zustand `persist`) so the partner-role check runs deterministically
after the session is restored; a session without the partner role always falls back to `member`.
Consequences: the resend timer and lockout UI can be exercised without a backend; the dev-only
"use mock code" chip is gated on `isDev && AUTH_PROVIDER === 'mock'`.

## ADR-015 (2026-10-08) Component library conventions (part 1: primitives)

Context: every control needs role/label/state, a 44 pt target, theme tokens only and reduce-motion
support, while the library itself must stay free of i18n strings.
Decision: the base pressable is `Animated.createAnimatedComponent(Pressable)` (`PressableScale`)
with a spring scale from `usePressAnimation` (no-op under reduce motion), no Android ripple, and
`hitSlop` wherever the visual box is under 44 pt. Spoken text that cannot be static (clear button,
secure toggle, avatar/rating/OTP labels) is a required prop enforced at the type level instead of
`t()` calls inside the library. Input focus ring uses RN 0.86 `outline*` styles so focus never
shifts layout; error > focus > rest precedence lives in one `fieldBorder()`. `OTPInput` is one
hidden `TextInput` owning the whole code (`textContentType="oneTimeCode"`, `autoComplete`
`sms-otp` / `one-time-code`) with purely visual cells, which is what makes SMS autofill and paste
work. `Rating` half stars are a clipped filled star over an outline star, and interactive mode is a
single `adjustable` element with increment/decrement actions. Buttons default to a light haptic,
chips and icon buttons to a selection haptic, cards are silent. No root `src/shared/ui/index.ts`
barrel: components are imported by folder.
Consequences: `ui.priceTag.perMonth` is a plain suffix ("в месяц") consumed by `PriceTag`'s
`period` prop. Jest cannot load lucide-react-native's `.mjs` build, so a manual mock
(`src/shared/ui/Pressable/__mocks__/lucide-react-native.ts`) re-exports the CJS build until
`jest.config.js` maps it.

## ADR-016 (2026-10-08) Component library conventions (part 2: feedback, overlays, gallery)

Decision: at most 3 toasts are on screen and a 4th evicts the oldest (errors auto-dismiss after
6 s, others after 4 s); the sheet's drag-to-close pan is attached to the header area only so
scrollable content never fights it, and the handle doubles as the accessible close control (the
backdrop is hidden by `accessibilityViewIsModal`); `ErrorState` is a thin composition over
`EmptyState` reading `common.states.*` copy, with "Open settings" as the primary action for
permission errors; skeletons use a translated highlight band (no gradient dependency) and are static
under reduce motion; `Tabs` scroll above 4 items with a spring indicator that jumps under reduce
motion. Test doubles for react-native-gesture-handler and lucide live in
`src/shared/ui/gallery/testing` because `jest.setup.ts` does not register RNGH's jestSetup.
Consequences: the dev gallery (`/dev/gallery`) shows every component in every state with live
theme and language switches; its title is the native stack header, the in-screen header carries
only the subtitle and the switches.

## ADR-017 (2026-10-08) Auth screens: validated route params, inline vs toast errors, wall-clock timers

Decision: the verify screen receives route params as a prop (the route file passes
`useLocalSearchParams()`) and validates them with zod; invalid params render a not-found style state
with "Change number". The phone form stores the masked text and converts to E.164 in the zod schema
via `transform` (one source of truth). Error routing: `INVALID_PHONE`, `INVALID_CODE`,
`CODE_EXPIRED`, `TOO_MANY_REQUESTS`, `LOCKED` are inline under the field; `NETWORK` and `UNKNOWN`
go to a toast. `TOO_MANY_REQUESTS` shows whole minutes rounded up (minimum 1). `LOCKED` without
`retryAfterSec` disables the input until a successful resend; with it, "locked until HH:mm" and an
automatic unlock. The resend countdown is anchored to a `Date.now()` deadline so backgrounding does
not extend the wait. Legal links use `router.push` through `navigation.ts` helpers with
`accessibilityRole="link"` pressables (testable with a plain router mock). Pure modules import from
`@/services/auth/types` so unit tests do not load the Supabase client.
Consequences: Maestro flows in `e2e/` describe the happy path and error states; they run in CI only.

## ADR-018 (2026-10-08) Navigation shell: `Stack.Protected` guards with an index anchor

Context: SDK 57 Expo Router offers `Stack.Protected` with a `guard` prop (no `redirectTo`, which is
SDK 58+); the app has three route groups (public, member, partner).
Options: rely on the "first available screen" when a guard closes; an unprotected `index` anchor
that redirects; manual `router.replace` calls in every flow.
Decision: `app/index.tsx` is the unprotected anchor, set as the root Stack's `initialRouteName`
(React Navigation falls back to `initialRouteName` when a guard removes the focused route;
without it the first declared screen wins and its first nested route is chosen by name length,
which sent sign-out to `verify`), rendering `<Redirect>` to a pure, unit-tested
`resolveEntryHref()`; guards come from `resolveShellGuards()`: public = onboarding not completed
or signed out, partner = signed in and `activeMode === 'partner'` and the session holds the partner
role, member = signed in and not partner. When a guard closes (sign-out, mode switch) Expo Router
drops that group's history and lands on the anchor, which forwards. Bootstrap gates (fonts loaded
or failed, auth status resolved, onboarding and theme stores hydrated, `initI18n()` resolved) keep
the root layout at `null` with the splash up; `SplashScreen.preventAutoHideAsync()` runs at module
scope. Status bar style follows the resolved theme and `expo-system-ui` paints the root background
for Android edge-to-edge. Sign-out clears the local session even when the remote call fails.
Consequences: the sign-out hook is shared from `src/services/auth/useSignOut.ts` (features may not
import each other); tab screens pass `edges={['top']}` because the tab bar pads the bottom inset;
returning a user to a deep link requested while signed out is not implemented (M2).

## ADR-019 (2026-10-09) Web preview exports as a single-page app (`web.output: "single"`)

Context: `expo export --platform web` with `output: "static"` pre-renders every route in Node,
where `window` is undefined; zustand `persist` (theme, onboarding), the query persister and
supabase-js all touch AsyncStorage's `localStorage` shim at store creation, so the export crashed.
Options: (a) make every storage touchpoint SSR-safe; (b) `output: "single"` (client-rendered SPA).
Decision: (b). Web is a developer preview only (ADR-007); SEO and static HTML bring nothing, and (a)
would add guards to seven modules for a target that is not shipped.
Consequences: `expo export --platform web` and `npm run web` need no SSR safety; if web ever becomes
a product target, revisit (a) together with a proper `localStorage` boundary.

## ADR-020 (2026-10-09) Decorative and hidden elements use `aria-hidden`, not the legacy props

Context: components marked decorative nodes with `accessibilityElementsHidden` +
`importantForAccessibility="no-hide-descendants"` or `accessible={false}`. react-native-web 0.21
(the dev preview) forwards those to the DOM and React logs an error for every render.
Options: (a) `Platform.select` around each usage; (b) the cross-platform `aria-hidden` prop that
React Native ≥0.71 maps to both native props and to the DOM attribute.
Decision: (b) everywhere in `src/` and `app/`; an architecture-style grep in review keeps the legacy
props out. Behaviour on iOS/Android is identical; the web console is clean.
Consequences: tests assert `aria-hidden`; components that exposed `accessible` keep their prop API
but never forward `accessible={false}` to the DOM.

## ADR-021 (2026-10-09) Tab bar reserves the home-indicator inset itself

Context: on web (and Android devices without a gesture inset) the tab labels clipped at the bottom.
Decision: `useTabBarScreenOptions` sets `height = 56 + max(insets.bottom, 8)` and the matching
`paddingBottom`, so the icon + label block always has the same room regardless of inset.
