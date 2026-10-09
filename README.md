# 1Heal

Health, fitness and wellness subscription aggregator for Uzbekistan: one monthly subscription gives
members access to many partner venues (gyms, pools, yoga, dance, martial arts, spa, massage,
recovery). Members discover a venue, book a drop-in or class, show a rotating QR code at the door,
and venue staff scan it to consume a visit from the monthly quota.

One Expo (React Native) codebase serves two modes, **member** and **partner** (venue staff). A small
admin web app lives in `apps/admin` as a separate package.

Status: Milestone 1 (foundation, design system, i18n, auth with a mock provider, navigation shell
with placeholder tabs). See `docs/PLAN.md` for the full scope and the remaining milestones.

## Prerequisites

- Node.js 22 and npm 10 (the lockfile is npm; do not use yarn/pnpm/bun).
- Git. On Windows, Git Bash is enough for every script in this repo.
- For a phone: the Expo Go app (iOS/Android) on the same Wi-Fi as your machine.
- Optional: Android Studio (emulator) and/or Xcode (simulator) for `npm run android` / `npm run ios`.
- Optional: EAS CLI (`npm i -g eas-cli`) for cloud builds, Supabase CLI + Docker for the database
  (`npm run db:*`), Maestro for end-to-end flows (`npm run e2e`).

## Setup

```bash
npm ci
cp .env.example .env
```

Edit `.env`. Only `EXPO_PUBLIC_*` variables reach the app bundle, and they are public by definition;
server secrets (SMS, payment and service-role keys) never enter this repo. The variables are
validated with zod in `src/shared/config/env.ts`, so a missing or malformed value fails fast at
start-up and names the offending key. The defaults in `.env.example` run the app fully offline with
the mock auth provider.

## Run

```bash
npm start            # Metro dev server; press a (Android), i (iOS), w (web), or scan the QR in Expo Go
npm run android      # same, opens an Android emulator/device directly
npm run ios          # same, opens an iOS simulator (macOS only)
npm run web          # browser preview at http://localhost:8081
```

- **Expo Go** works for everything in Milestone 1 (no custom native modules yet). Scan the QR code
  printed by `npm start`.
- **Development build**: once native modules beyond Expo Go are added, build a dev client with
  `eas build --profile development` (see EAS below) and `npm start` will connect to it.
- **Web** is a developer preview only (ADR-007), not a shipped target: use it to check screens
  quickly in a browser. `web.output` is `single` (client-rendered SPA), so there is no static
  pre-rendering step (ADR-019).
- **Component gallery**: in dev builds open Profile → "Component gallery" (route `/dev/gallery`)
  to see every UI component in all states with live theme and language switches.

## Quality checks

```bash
npm run check          # typecheck + lint + unit tests (run before every commit)
npm run typecheck      # tsc --noEmit (TypeScript 6 strict, noUncheckedIndexedAccess)
npm run lint           # expo lint (ESLint flat config + prettier plugin)
npm run lint:fix
npm run format         # prettier --write
npm run format:check
npm test               # jest: unit, component (Testing Library) and architecture tests
npm run test:watch
npm run test:ci        # jest --ci --coverage (what CI runs)
npm run e2e            # maestro test e2e/ (needs a running simulator/emulator with the app)
npm run db:start | db:reset | db:test | db:types   # Supabase local DB (needs Docker + Supabase CLI)
```

Architecture tests in Jest enforce the rules from `CLAUDE.md`: no hex colours outside
`src/shared/theme/tokens.ts`, no raw strings in JSX (everything goes through `t()`), all three
locale files in parity, WCAG AA contrast for every colour pairing in both themes. Husky runs the
checks on commit.

Add packages with `npx expo install <pkg>` (dev deps: `npx expo install <pkg> "--" --dev`) so the
versions stay compatible with the Expo SDK.

## Mock auth (default in development)

`EXPO_PUBLIC_AUTH_PROVIDER=mock` runs `MockAuthService` with no network:

- Any valid Uzbek mobile number (`+998 XX XXX XX XX`, known operator codes) signs in with the
  SMS code **123456**. In dev builds the OTP screen shows a chip that fills it in.
- Phones ending in **00** (for example `+998 90 123 45 00`) also receive the **partner** role,
  which unlocks "Switch to partner mode" in the profile. `+998 90 000 00 00` is additionally
  **admin**.
- Limits mirror production so the UI can be exercised: 30 s resend cooldown, 3 code requests per
  10 minutes, 5 wrong codes lock the number for 15 minutes, codes expire after 5 minutes.

Details: `src/services/README.md`.

## Switching to Supabase auth

1. In `.env` set `EXPO_PUBLIC_AUTH_PROVIDER=supabase`, `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (env validation fails if either is missing).
2. Roles are read from the JWT claim `app_metadata.roles`, written by a custom access-token hook
   from the `user_roles` table (Milestone 2). Without the claim every user is a member.
3. SMS delivery goes through the Supabase "Send SMS" auth hook and an Edge Function with an
   `SmsProvider` adapter (Eskiz in staging/production), see ADR-003 in `docs/DECISIONS.md`.

The feature code never imports a vendor SDK: all provider access goes through the interfaces in
`src/services/*`, so the backend can later move to self-hosted Postgres inside Uzbekistan.

## Project layout

```
app/                      Expo Router routes only; thin screens that compose features
  (public)/               onboarding, sign-in, verify, legal/[doc]
  (member)/(tabs)/        home, discover, bookings, qr, profile  (+ subscription/plans, legal/[doc])
  (partner)/(tabs)/       scan, today, stats, settings
  dev/gallery             component gallery (dev builds only)
src/features/<domain>/    screens, components, hooks, api and tests, co-located per domain
src/shared/ui             component library (Button, Input, OTPInput, Sheet, Toast, ...) + gallery
src/shared/theme          tokens (the only file with colour literals), ThemeProvider, fonts, motion
src/shared/i18n           i18next setup, ru/uz/en locale JSON, formatters (money, dates, plurals)
src/shared/utils          pure helpers (phone masks and validation, ...)
src/shared/config         brand name, zod-validated env, feature flags
src/shared/providers      AppProviders, route guards, app bootstrap, status bar, tab bar options
src/shared/brand          logo mark and lockup (react-native-svg)
src/services/             auth, api (Supabase client), storage, query, network, session
src/domain/               pure mirrors of server rules for previews (quota, booking, penalties)
supabase/                 migrations, Edge Functions, seed, pgTAP tests (from Milestone 2)
apps/admin                admin web app, separate package and lockfile (ignored by Metro)
assets/                   brand SVG sources and generated icons/splash (scripts/generate-assets.mjs)
docs/                     product plan, decisions, compliance, copy glossary, brand, screen docs
e2e/                      Maestro flows
```

Import aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`. Features never import each other's
internals; they share through `src/shared` and `src/services`. Locales: `ru` (default), `uz`
(Latin), `en`; the brand name is the single constant `BRAND_NAME` in `src/shared/config/brand.ts`.

## Documentation index

| Document                     | Content                                                                |
| ---------------------------- | ---------------------------------------------------------------------- |
| `CLAUDE.md`                  | Engineering conventions and rules (also for AI assistants)             |
| `docs/PLAN.md`               | Product scope, environment matrix, data model, screen map, milestones  |
| `docs/DECISIONS.md`          | ADR log (append only)                                                  |
| `docs/COMPLIANCE.md`         | Legal and compliance flags for Uzbekistan, open questions              |
| `docs/COPY.md`               | Copy glossary for ru/uz/en                                             |
| `docs/BRAND.md`              | Logo construction, asset generation                                    |
| `docs/screens/auth.md`       | Auth screens: states, errors, test ids                                 |
| `docs/screens/shell.md`      | Providers, route guards, tab bars, deep links, placeholder inventory   |
| `src/services/README.md`     | Service interfaces, auth flow, mock conventions, switching to Supabase |
| `src/shared/ui/README.md`    | Component library conventions                                          |
| `src/shared/theme/README.md` | Design tokens and theming                                              |
| `src/shared/i18n/README.md`  | Locale files, key conventions, formatters                              |
| `src/domain/README.md`       | Client-side mirrors of server rules                                    |

## EAS builds and updates

Profiles are defined in `eas.json`: `development` (dev client, iOS simulator + Android APK),
`development-device` (dev client for a physical iPhone), `preview` (internal distribution) and
`production` (store builds, auto-incremented build numbers). Each profile is bound to an EAS Update
channel of the same name.

```bash
npm i -g eas-cli && eas login
eas init                                        # once: links the project (writes extra.eas.projectId)
eas build --profile development --platform android
eas build --profile development --platform ios  # simulator build
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --profile production --platform android   # internal track, draft release
eas update --channel preview --message "..."
```

`eas init` has not been run yet, so these commands are not runnable until the project is linked to
an Expo account. Credentials and store secrets are managed by EAS, not committed.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

- **check**: `npm ci`, typecheck, lint with zero warnings, prettier check, `npm run test:ci`
  (coverage uploaded as an artifact).
- **audit**: `npm audit --audit-level=high` on production dependencies.
- **db**: starts a local Supabase and runs migrations + pgTAP tests; skipped until
  `supabase/config.toml` exists (Milestone 2).
- **e2e-smoke**: Maestro placeholder on pull requests; the emulator runner is configured in
  Milestone 3 together with an EAS development build artifact.

The authoring machine for Milestone 1 had no Android SDK, Xcode, Docker, Supabase CLI or EAS CLI:
simulator runs, local DB tests and EAS builds are written to run in CI and were not executed locally.

## License

See `LICENSE`.
