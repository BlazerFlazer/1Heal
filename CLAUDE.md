# 1Heal — project conventions

1Heal is a health, fitness and wellness subscription aggregator for Uzbekistan: one monthly
subscription gives members access to many partner venues. One Expo (React Native) codebase serves
members and partner (venue staff) mode; a small admin web app lives in `apps/admin`.
The brand name is a single constant: `src/shared/config/brand.ts` (`BRAND_NAME`). Never hardcode it.

Read `docs/PLAN.md` for scope, data model, screen map and milestones. Decisions go in
`docs/DECISIONS.md` (ADR style, append only). Open risks and legal flags go in `docs/COMPLIANCE.md`.

## Stack (verified versions live in package.json — do not trust memory)

- Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6 strict + `noUncheckedIndexedAccess`.
  New Architecture and React Compiler are on. Expo Router with typed routes.
- Before touching any Expo/RN API, check the versioned docs:
  `https://docs.expo.dev/versions/v57.0.0/` and `https://docs.expo.dev/llms.txt`.
- Data: TanStack Query (persisted to AsyncStorage for offline reads), Zustand for UI/session state,
  zod at every boundary (API responses, storage, env, forms). Forms: react-hook-form + zod resolver.
- Backend: Supabase (Postgres, Auth, RLS, Edge Functions, Storage, Realtime, pg_cron) in `supabase/`.
  All provider access goes through interfaces in `src/services/*` so the backend can move to
  self-hosted Postgres inside Uzbekistan without touching feature code.
- i18n: i18next + expo-localization. Locales: `ru` (default), `uz` (Latin), `en`. Keys in
  `src/shared/i18n/locales/<lng>/*.json`. Glossary in `docs/COPY.md`.
- UI: own component library in `src/shared/ui`, tokens in `src/shared/theme/tokens.ts`,
  Inter via `@expo-google-fonts/inter`, icons from `lucide-react-native`, lists via FlashList,
  images via expo-image, motion via Reanimated (respect reduce-motion).

## Layout

```
app/                      Expo Router routes only (no business logic; thin screens that compose features)
src/features/<domain>/    screens, components, hooks, api, tests co-located (auth, home, discover, venue,
                          booking, checkin, subscription, payments, profile, reviews, partner, onboarding)
src/shared/ui             component library (+ gallery screen at app/dev/gallery, dev builds only)
src/shared/theme          tokens, theme provider, typography, spacing, elevation
src/shared/i18n           i18next setup, locale files, formatters (currency, date, plural)
src/shared/utils          pure helpers (phone, dates, money)
src/shared/config         brand, env (zod-validated), feature flags
src/services/             api client, auth, sms, payments, maps, analytics, notifications (interfaces + adapters)
src/domain/               pure, unit-tested mirrors of server rules (quota, booking, cancellation, penalties)
supabase/                 migrations, functions (Deno), seed, tests (pgTAP)
apps/admin                admin web app (separate package, separate lockfile; Metro ignores it)
docs/                     PLAN, ARCHITECTURE, DECISIONS, COMPLIANCE, COPY, RUNBOOK
e2e/                      Maestro flows
```

Import aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`. Routes import from `@/features/...`.
Features must not import from each other's internals; share through `src/shared` or `src/services`.

## Commands

```bash
npm run start          # expo start (dev client / Expo Go)
npm run web            # web preview (dev-only convenience, not a product target)
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint (eslint flat config + prettier)
npm run format         # prettier --write
npm test               # jest (unit + component + architecture tests)
npm run test:watch
npm run db:*           # supabase migrations/tests (needs Supabase CLI + Docker)
npm run e2e            # maestro test e2e/ (needs a simulator/device)
npm run check          # typecheck + lint + test — run before any commit
```

Always add packages with `npx expo install <pkg>` (dev deps: `npx expo install <pkg> "--" --dev`).

## Rules

- Never hardcode colors, spacing, radii or font sizes outside `src/shared/theme/tokens.ts`.
  An architecture test fails the build on hex colors elsewhere.
- Never trust the client: quota, booking, waitlist, cancellation, penalty and check-in rules are
  enforced in Postgres functions / Edge Functions. `src/domain` mirrors are for previews only.
- Money is integer UZS (`amount_uzs`). Format with `formatMoney` from `src/shared/i18n/format.ts`.
- Phone numbers are stored E.164 (`+998XXXXXXXXX`); display as `+998 XX XXX XX XX`.
- Every screen handles: loading, empty, error, offline, permission-denied. In all three languages
  and both themes. No raw strings in JSX: everything goes through `t()`.
- Every interactive control has `accessibilityLabel`/`accessibilityRole` and a 44pt hit target.
- Secrets never enter the repo or the client bundle. Only `EXPO_PUBLIC_*` vars reach the app and
  they are public by definition. Service-role keys live only in Edge Function env.
- No TODO logic in core flows. Stubs only at external-provider boundaries, marked `// PROVIDER-STUB`.
- Files under ~250 lines where practical. No dead code, no unused dependencies.
- Commits: small, Conventional Commits (`feat(auth): ...`). `main` must always pass `npm run check`.

## Definition of done (per task)

1. Typecheck, lint and unit tests pass (`npm run check`).
2. New UI states covered (loading/empty/error/offline) and strings added in `ru`, `uz`, `en`.
3. New server rules have DB tests (pgTAP) and, where concurrency matters, a concurrency test.
4. Decisions with alternatives recorded in `docs/DECISIONS.md`; risks in `docs/COMPLIANCE.md`.
5. If something could not be run in this environment (simulator, Docker, EAS), the report says so
   explicitly. Never claim a result that was not observed.

## Environment limits of the authoring machine (Windows 11)

No Android SDK, Xcode, Docker, Supabase CLI or EAS CLI are installed. Simulator boots, Supabase local
DB tests and EAS builds cannot be executed here; they are written to be run in CI
(`.github/workflows/ci.yml`) and reported as "not run locally".
