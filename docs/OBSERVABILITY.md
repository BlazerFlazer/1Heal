# Observability (Sentry)

Error and crash monitoring runs on Sentry, organization `blaz-org` (EU region). See ADR-022 for
the decision and COMPLIANCE §8 for the data-protection notes.

| Project           | Platform     | Used by                                              | Status                               |
| ----------------- | ------------ | ---------------------------------------------------- | ------------------------------------ |
| `oneheal-mobile`  | react-native | Expo app, member and partner modes                   | wired (`src/services/observability`) |
| `oneheal-backend` | node         | Supabase Edge Functions (SMS hook, payment webhooks) | created; wired as the functions ship |

Environments: `development` (local), `staging` (EAS `preview` profile), `production`.

## App configuration

| Variable                     | Where                       | Notes                                                                  |
| ---------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `EXPO_PUBLIC_SENTRY_ENABLED` | `.env`, `eas.json` profiles | `true` turns the SDK on; off by default locally                        |
| `EXPO_PUBLIC_SENTRY_DSN`     | `.env`, `eas.json` profiles | public by design, safe in the bundle                                   |
| `EXPO_PUBLIC_APP_ENV`        | `eas.json` profiles         | maps to the Sentry environment                                         |
| `SENTRY_AUTH_TOKEN`          | EAS secret only             | build-time source map and dSYM upload; never in the repo or the bundle |

The backend DSN goes into the Edge Function environment as `SENTRY_DSN` (Supabase secrets), never
into the app.

## What the SDK does

- `initObservability()` runs at module scope of `app/_layout.tsx`; the root layout is wrapped with
  `Sentry.wrap` and the root `ErrorBoundary` with `wrapExpoRouterErrorBoundary`, so render errors
  arrive with route context.
- `expoRouterIntegration` records navigation spans; native builds also track slow/frozen frames
  and time to initial display.
- `useObservabilityUser()` sets the user to the internal UUID and tags `app_mode`
  (`member`/`partner`).
- `captureError(error, tags)` reports handled errors from feature code.
- Every event passes through `scrubEvent` (see the tests for exactly what is removed).

## Readable production stack traces

`metro.config.js` uses `getSentryExpoConfig`, which stamps Debug IDs into bundles and source maps.
The `@sentry/react-native/expo` plugin in `app.json` uploads Hermes source maps and iOS dSYMs during
`eas build` when `SENTRY_AUTH_TOKEN` is present:

```bash
eas env:create --name SENTRY_AUTH_TOKEN --visibility secret --environment production
```

Create the token in Sentry under Settings → Developer Settings → Organization Tokens. Web dev
bundles are not symbolicated (Sentry docs: source context in development does not work on web).

## Verifying locally

Set `EXPO_PUBLIC_SENTRY_ENABLED=true`, start the app, trigger an error, and look for it in the
`oneheal-mobile` project filtered by `environment:development`. The first verification event was
`ONEHEAL-MOBILE-1` (2026-10-10, web preview, render error through the root error boundary).
