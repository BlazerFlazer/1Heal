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
