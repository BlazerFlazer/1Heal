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

## ADR-022 (2026-10-10) Sentry for crash and error monitoring, privacy-first

Context: production needs crash/error visibility with readable stack traces. The org `blaz-org`
is hosted in Sentry's EU region; the app handles health-adjacent data of Uzbek users.
Options: (a) Sentry SaaS with strict scrubbing; (b) self-hosted Sentry/GlitchTip inside Uzbekistan;
(c) no third-party monitoring until the localisation question is settled.
Decision: (a) now, behind `EXPO_PUBLIC_SENTRY_ENABLED`, with the SDK abstracted in
`src/services/observability` so (b) stays a config change (same SDK, different DSN).
Projects: `oneheal-mobile` (react-native) for the app, `oneheal-backend` (node) for Supabase Edge
Functions; dev/staging/production are Sentry environments, not separate projects.
SDK version: `@sentry/react-native` ~8.30 instead of Expo SDK 57's pinned ~7.11 (released before
React Native 0.86 and without `expoRouterIntegration`/`wrapExpoRouterErrorBoundary`); it is listed
in `expo.install.exclude` so `expo install --fix` does not downgrade it.
Privacy: `sendDefaultPii: false`; user identified by internal UUID only; `beforeSend`,
`beforeSendTransaction` and `beforeBreadcrumb` scrub phones, e-mails, JWTs, bearer tokens and
sensitive keys and drop URL query strings; replays only on error with all text, images and vectors
masked; trace headers only to the Supabase origin; no screenshots or view hierarchy.
Consequences: production stack traces need `SENTRY_AUTH_TOKEN` as an EAS secret so the config
plugin uploads source maps and dSYMs during `eas build`. COMPLIANCE §8 tracks the cross-border flow.

## ADR-023 (2026-10-10) Geo with cube + earthdistance, not PostGIS

Context: discovery needs "venues near me" and an "open now" filter. PostGIS is available on
Supabase but not on the embedded PostgreSQL the DB tests run on, nor guaranteed on a minimal
self-hosted Postgres inside Uzbekistan (COMPLIANCE §1).
Options: (a) PostGIS `geography(Point)` + `ST_DWithin`; (b) `lat/lng double precision` with the
contrib extensions `cube` + `earthdistance` and a GiST index on `ll_to_earth(lat, lng)`;
(c) plain bounding boxes in SQL.
Decision: (b). `venues.lat/lng` plus `venues_earth_idx`; `rpc_nearby_venues` prefilters with
`earth_box` and orders by `earth_distance` (metres, `distance_m int`), active venues only, limit
capped at 200, security invoker. Extensions are created in schema `extensions` when it exists
(Supabase) and in `public` otherwise (0001).
Consequences: spherical-earth accuracy is enough for distance sorting at city scale; polygons
(districts as shapes, service areas) would need PostGIS later, behind a guarded migration.
PLAN §3 now lists `lat`, `lng` instead of `location geography`.

## ADR-024 (2026-10-10) Database tests in TypeScript on embedded PostgreSQL, Supabase local in CI

Context: PLAN asked for pgTAP. The authoring machine has no Docker or Deno, so neither the
Supabase local stack nor pgTAP can run here; the embedded PostgreSQL 17 (npm `embedded-postgres`,
zonky binaries) starts in ~10 s and has every contrib extension we use except `pg_cron`,
`postgis` and `pgtap`.
Options: (a) pgTAP only, run in CI; (b) Jest + `pg` tests in TypeScript against any Postgres URL:
an embedded cluster locally and Supabase local (`supabase start`) in CI; (c) both.
Decision: (b). `npm run db:test` (`jest.db.config.js`, Babel TS, 4 workers) starts the embedded
cluster in `globalSetup`, applies `supabase/tests/_shim` + migrations + seed with
`scripts/db/migrate.mjs`, and every test runs in `runInTransaction` (always rolled back). With
`DATABASE_URL` set nothing is started; CI job `db` runs the suite twice, against Supabase local
(real `auth` schema) and against the embedded cluster. Helpers live in
`supabase/tests/_harness/db.ts` (`asAnon`, `asUser`, `asService`, `createAuthUser`,
`expectDenied`, `expectErrorCode`).
Consequences: the same suite runs on Windows without Docker and on the real stack; RLS is tested
by switching role + JWT claims the way PostgREST does. Edge Function logic is plain TypeScript
with Deno only at the entry point, so the same Jest run covers it. `supabase` (CLI),
`embedded-postgres` and `pg` are pinned devDependencies; CI calls the CLI through `npx`.

## ADR-025 (2026-10-10) A Supabase shim for plain PostgreSQL, applied only where `auth` is missing

Context: migrations reference `auth.users`, `auth.uid()`, the roles `anon`, `authenticated`,
`service_role` and `supabase_auth_admin`, and schema `extensions`, which exist only on Supabase.
Decision: `supabase/tests/_shim/0000_supabase_shim.sql` creates exactly those (the `auth.users`
columns the app and seed use; `auth.uid/role/email/jwt` reading `request.jwt.claim(s)` like
supabase/postgres; Supabase's default privileges in `public`). The runner applies it only when
schema `auth` is absent (`DB_SHIM=1|0` overrides), and the shim raises if `auth.uid()` already
exists, so it can never touch a real project. Migrations stay valid on both targets: Supabase-only
features (`pg_cron`, the `supabase_realtime` publication, `auth.identities`) are guarded by
existence checks.
Consequences: GoTrue, PostgREST, Storage, Realtime and cron are not emulated; anything depending
on them is verified only by the CI job against Supabase local (RUNBOOK "The shim caveat").

## ADR-026 (2026-10-10) Migration files and runner

Context: two appliers (the Supabase CLI and our harness) must agree on order, versions and
transactions.
Decision: the M2 baseline uses four-digit, domain-ordered prefixes (`0001_extensions` …
`0010_realtime_feature_flags`; `0090+` for the SMS hook); from M3 on, new files use 14-digit
timestamps, which sort after the baseline. Files contain no `begin`/`commit`; the harness wraps
each in its own transaction, records name + checksum in `harness.schema_migrations`, skips files
whose version is already in `supabase_migrations.schema_migrations` (applied by the CLI) and fails
on a file edited after it was applied. A migration that adds tables with `updated_at` ends with
`select public.ensure_updated_at_triggers()`; every table enables RLS with explicit grants
(`rls-coverage.test.ts` enforces RLS and pins the anon-readable list). No cron migration in M2:
nothing needs scheduling until M5.
Consequences: migrations are append-only once merged to `main`; fixes go in a new file.

## ADR-027 (2026-10-10) Roles in the JWT via the custom access-token hook

Context: RLS and the app both need roles (member, partner, admin) without a lookup per request
(ADR-013 reads them from the token on the client).
Options: (a) copy roles into `auth.users.raw_app_meta_data` from triggers; (b) Supabase's custom
access-token hook as a Postgres function; (c) look up `user_roles` in every policy.
Decision: (b). `public.custom_access_token_hook(event jsonb)` sets `claims.app_metadata.roles` to
the user's `user_roles` sorted in enum order (`member, partner, admin`), `[]` when there are none,
and keeps GoTrue's other `app_metadata` keys. Only `supabase_auth_admin` may execute it (plus a
dedicated select policy on `user_roles`). New users get `member` from the `on_auth_user_created`
trigger. Policies read roles through `app_role()`, `has_role()` and `is_admin()`; venue scoping
uses `is_venue_staff()`/`is_venue_owner()` (security definer). `SupabaseAuthService` parses the
claim with zod and falls back to `['member']` for `[]`, a missing claim or an unknown role
(unit-tested with the hook's exact claim shape; the hook itself is tested in
`supabase/tests/schema/identity.test.ts`).
Consequences: a role change applies at the next token refresh (≤ 1 h, `jwt_expiry`); revoking an
admin immediately also requires deleting their sessions. The hook is enabled in
`supabase/config.toml`; on a cloud project it must be enabled in Dashboard → Authentication →
Hooks.

## ADR-028 (2026-10-10) Send-SMS hook: Standard Webhooks, own rate limits, provider-agnostic

Context: ADR-003 chose Supabase Auth phone OTP with a Send-SMS hook. The hook must be verifiable,
testable without Deno, and must not become an SMS-pumping vector.
Decision: `supabase/functions/auth-sms-hook` is a thin `Deno.serve` wrapper; all logic lives in
`supabase/functions/_shared` as plain TypeScript (extensionless imports mapped by
`supabase/functions/deno.json`, wired with `import_map` in `config.toml`). Requests are verified
with Standard Webhooks (HMAC-SHA256, 5 min tolerance, several `v1,whsec_` secrets separated by
`|` for rotation). Before sending, `public.sms_rate_limit_check` (service role only, called through
PostgREST) allows 3 per phone per 10 min, 10 per phone per 24 h and 20 per IP per hour, counting
`sms_send_log` rows with status `sent` or `failed`; every attempt is logged (`sent`, `failed`,
`rate_limited`). Responses follow GoTrue's hook contract: 200 `{}` on delivery; 200 with
`error.http_code` 429 (our limit, message carries the seconds), 400 (invalid number) or 500
(provider auth/unknown); 503 with `retry-after: 1` when the provider or the limiter is
unreachable; 401/400/413 for bad signature, payload or size. OTP texts are templated per locale
(`ru` default, read from user metadata) with the brand from `_shared/brand.ts` (tested equal to
`BRAND_NAME`). Providers: `MockSmsProvider` (dev) and `EskizSmsProvider` (token cached, 3 s
timeout).
Consequences: the hook cannot be served on this machine (no Docker/Deno); its logic is covered by
`npm run db:test`, including a database test of the limiter. Phones are masked in logs.

## ADR-029 (2026-10-10) Deterministic demo seed with a fixed anchor date

Context: demos, screenshots, e2e flows and tests need the same rich data everywhere (PLAN M2: 25+
venues, 3 plans, 100 members), including scripted stories (waitlist, frozen, penalty).
Options: (a) hand-written SQL; (b) a generator relative to `now()`; (c) a generator with a fixed
PRNG seed and a fixed anchor date, output committed.
Decision: (c). `node supabase/seed/generate.mjs` builds a validated model (30 venues, 12
categories, 106 users, 2 017 class sessions, ledgers written by the real triggers) and writes
`supabase/seed.sql`; `--check` (run by the DB suite) fails when the file is stale. Everything is
relative to Monday 2026-10-12 00:00 Asia/Tashkent; ids derive from readable keys; inserts are
idempotent (`on conflict do nothing` plus state-guarded updates). Supabase-only `auth` columns and
`auth.identities` are written only where they exist. Demo phones are listed in `docs/SEED.md`.
Consequences: the timetable does not move by itself; until the M5 cron jobs exist the anchor is
moved by whole weeks and the seed regenerated (RUNBOOK "Refresh the demo seed").

## ADR-030 (2026-10-10) Generated database types are committed and checked in CI

Context: the app needs table, enum and RPC types that cannot drift from the migrations.
Decision: `npm run db:types` starts the embedded cluster, applies shim + migrations (no seed), runs
the pinned Supabase CLI (`supabase gen types typescript --db-url ... --schema public`, no Docker
needed), formats the output with Prettier and writes `src/services/api/database.types.ts`, which
is committed and never edited by hand. CI job `db` regenerates it and fails on any diff. The
Supabase client is `createClient<Database>` (`AppSupabaseClient`); repositories select explicit
columns and still validate rows with zod at the boundary.
Consequences: a migration PR must include the regenerated file. Only schema `public` is typed;
`auth` and `storage` stay behind the service interfaces.

## ADR-031 (2026-10-10) Remote feature flags from `public.feature_flags`

Context: M1 shipped local per-environment defaults behind a `FeatureFlagProvider` interface. Table
keys must match `^[a-z0-9_]+$`; the app's keys are dotted or camelCase.
Decision: each row carries the app key in `payload.app_key`. `SupabaseFlagProvider`
(`src/services/api/featureFlagProvider.ts`) selects `key, enabled, payload` and maps rows one by
one: boolean flags take `enabled`; non-boolean flags (`maps.provider`) take `payload.value` only
while `enabled`; rows without a known app key (`no_show_penalty` is a server rule) or with an
invalid value are skipped individually. `getFlagProvider()` returns it when
`EXPO_PUBLIC_AUTH_PROVIDER=supabase` with URL and key, else `LocalFlagProvider`.
`useFeatureFlagSync` loads after sign-in (the table is readable by `authenticated` only) and never
holds the splash screen; a failed fetch keeps the local defaults (`status: 'error'`). Live updates
use Realtime `postgres_changes` (migration 0010 adds the table to `supabase_realtime` where that
publication exists); each change triggers a refetch; on channel error or timeout the channel is
dropped and the next sign-in or app start fetches again.
Consequences: a deleted row does not revert its flag until the next app start (the store merges
remote values over defaults). `audience` targeting is not evaluated yet.
