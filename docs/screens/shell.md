# Navigation shell (M1)

How the app boots, which route group a user can reach, and where deep links land. Code lives in
`app/` (routes only), `src/shared/providers/` (provider stack, bootstrap, guards) and
`src/features/*/screens/` (the placeholder screens that M3–M7 replace with real features).

## Provider tree

`app/_layout.tsx` renders nothing (the native splash stays up) until `useAppBootstrap()` is ready,
then mounts:

```
GestureHandlerRootView
  SafeAreaProvider
    ThemeProvider            user preference ('system' | 'light' | 'dark') → resolved scheme
      QueryProvider          TanStack Query, persisted to AsyncStorage, paused while offline
        ToastProvider
          ThemedStatusBar    expo-status-bar style follows the theme; root view background too
          <Stack>            root navigator (see guards below)
```

i18n needs no provider: `@/shared/i18n/i18n` initialises i18next synchronously on import (the
root layout imports it first) and `initI18n()` later applies the persisted language.

### Bootstrap gates (`useAppBootstrap`)

The splash screen is hidden (`SplashScreen.hide()`) only when all of these are true:

| Gate                   | Source                                        |
| ---------------------- | --------------------------------------------- |
| Fonts loaded or failed | `useAppFonts()` (Inter 400/500/600/700)       |
| Session restored       | `useAuthBootstrap()` → status ≠ bootstrapping |
| Onboarding hydrated    | `useOnboardingStore().hydrated`               |
| Theme hydrated         | `useThemeStore().hydrated`                    |
| Locale applied         | `initI18n()` resolved (never throws)          |

A font failure still opens the gate (system font beats an eternal splash).
`SplashScreen.preventAutoHideAsync()` is called at module scope of the root layout, as the SDK 57
docs require.

### Error boundary

The root layout exports `ErrorBoundary` (= `RootErrorBoundary`): an `ErrorState` (generic) whose
retry calls Expo Router's `retry()`. It brings its own `ThemeProvider` because the provider tree may
be what threw; the safe area comes from Expo Router itself.

## Route groups and guards

`Stack.Protected` (SDK 57: `guard` prop only, no `redirectTo`) decides which groups exist in the
navigator. Guards come from `resolveShellGuards()` in `src/shared/providers/routeGuards.ts`:

| Group       | Guard                                                                     | Entry route                                 |
| ----------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `(public)`  | `!onboardingCompleted \|\| status === 'signedOut'`                        | `/(public)/onboarding`, `/(public)/sign-in` |
| `(member)`  | `status === 'signedIn' && !partnerMode`                                   | `/(member)/(tabs)`                          |
| `(partner)` | `status === 'signedIn' && activeMode === 'partner' && hasRole('partner')` | `/(partner)/(tabs)/scan`                    |

`partnerMode` is only real with the partner role; a stale "partner" preference without the role
falls back to the member group, so nobody can be locked out.

`app/index.tsx` is the unprotected anchor, declared as the root Stack's `initialRouteName`: it
`<Redirect>`s to `resolveEntryHref()`. When a guard closes (sign-out, mode switch), Expo Router
drops that group's history and falls back to the `initialRouteName` (without it, to the first
declared screen, whose nested first route is picked by name length), so it lands on the anchor,
which forwards to the right group. `app/dev/gallery.tsx` is declared only in dev builds (`__DEV__`)
and renders a not-found state in release builds. `app/+not-found.tsx` offers "Go home"
(`router.replace('/')`).

```
app/
  _layout.tsx                 providers, bootstrap, Stack.Protected, ErrorBoundary
  index.tsx                   anchor → Redirect
  +not-found.tsx
  dev/gallery.tsx             component gallery (dev only)
  (public)/…                  onboarding, sign-in, verify, legal/[doc]   (owned by the auth task)
  (member)/
    _layout.tsx               Stack, headerShown: false
    (tabs)/_layout.tsx        JS Tabs: index(Home) · discover · bookings · qr · profile
    (tabs)/{index,discover,bookings,qr,profile}.tsx
    subscription/plans.tsx    placeholder until M6
    legal/[doc].tsx           LegalDocScreen (same docs as the public route)
  (partner)/
    _layout.tsx
    (tabs)/_layout.tsx        JS Tabs: scan · today · stats · settings
    (tabs)/{scan,today,stats,settings}.tsx
```

### Tab bars

Both tab layouts use `useTabBarScreenOptions()` (`src/shared/providers/tabBar.tsx`): active/inactive
tints from `colors.tabBarActive` / `colors.tabBarInactive`, `surface` background with a hairline
`border` top, Inter overline labels, `sceneStyle` painted with `colors.background`. Icons are
lucide via `tabIcon(Icon)`; every tab has `title`, `tabBarAccessibilityLabel` (from `tabs.json`) and
`tabBarButtonTestID` (`tab-<key>`) for Maestro.

Tab screens pass `edges={['top']}` to `Screen`: the tab bar already pads the bottom inset.

### Status bar and edge-to-edge

Android runs edge-to-edge by default on SDK 57, so `expo-status-bar` exposes only `style`,
`hidden` and `animated` (no `translucent` / `backgroundColor`). `ThemedStatusBar` sets
`style="dark"` on the light theme and `"light"` on the dark one, and calls
`expo-system-ui.setBackgroundColorAsync(colors.background)` so the area behind the transparent
status bar and the gesture bar matches the theme (no-op on web).

## Placeholder screens (M1)

All real chrome, no "coming soon" pages: every screen shows the offline banner at the top, handles
light/dark, and uses the shared empty/loading states.

| Screen             | Feature folder      | What it does today                                                                                                                                                                                       |
| ------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home               | `features/home`     | time-of-day greeting by first name, subscription card → plans, nearby section (skeleton/empty) → discover                                                                                                |
| Discover           | `features/discover` | debounced search (300 ms), list/map toggle, empty states incl. "no results for «q»"                                                                                                                      |
| Bookings           | `features/bookings` | upcoming/past tabs, CTA → discover                                                                                                                                                                       |
| QR                 | `features/checkin`  | dashed QR frame, how check-in works, CTA → plans, offline note                                                                                                                                           |
| Profile            | `features/profile`  | avatar/name/phone, language & theme sheets, "soon" rows, support (mailto), legal sheet → `/(member)/legal/[doc]`, partner-mode switch (role-gated), dev gallery (`__DEV__`), sign-out sheet, app version |
| Partner · Scan     | `features/partner`  | dashed camera frame, disabled "Start scanning", helper + offline note                                                                                                                                    |
| Partner · Today    | `features/partner`  | bookings/waitlist tabs, empty states                                                                                                                                                                     |
| Partner · Stats    | `features/partner`  | three "—" stat cards with captions                                                                                                                                                                       |
| Partner · Settings | `features/partner`  | switch to member mode, sign-out sheet                                                                                                                                                                    |

Sign-out clears the local session even when the remote call fails (leaving is the intent); the
hook is duplicated in `profile` and `partner` because features may not import each other.

## Deep links

Scheme: `oneheal` (`app.json` → `expo.scheme`), link domain `app.oneheal.uz` (`BRAND_LINK_DOMAIN`).
Route groups are optional in URLs, so `oneheal://legal/terms` resolves to the group that is
currently reachable. Links into a protected group while signed out land on the anchor and are
redirected to sign-in; re-entry after sign-in is a M2 follow-up (see open issues).

| Link                                    | Route                                             | Milestone            |
| --------------------------------------- | ------------------------------------------------- | -------------------- |
| `oneheal://`                            | `index` → entry route                             | M1                   |
| `oneheal://sign-in`                     | `(public)/sign-in`                                | M2                   |
| `oneheal://legal/:doc`                  | `(public                                          | member)/legal/[doc]` | M2  |
| `oneheal://subscription/plans`          | `(member)/subscription/plans`                     | M1 (placeholder), M6 |
| `oneheal://discover`                    | `(member)/(tabs)/discover`                        | M1                   |
| `oneheal://bookings`, `/qr`, `/profile` | member tabs                                       | M1                   |
| `oneheal://venue/:id`                   | `(member)/venue/[id]`                             | M3                   |
| `oneheal://venue/:id/timetable`         | `(member)/venue/[id]/timetable`                   | M3                   |
| `oneheal://booking/:id`                 | `(member)/booking/[id]`                           | M4                   |
| `oneheal://subscription`                | `(member)/subscription`                           | M6                   |
| `oneheal://subscription/checkout?...`   | `(member)/subscription/checkout` (payment return) | M6                   |
| `oneheal://reviews/new?visit=:id`       | `(member)/reviews/new`                            | M5                   |
| `oneheal://partner/scan`                | `(partner)/(tabs)/scan`                           | M7                   |

## Tests

- `src/shared/providers/*.test.ts(x)`: guard matrix, bootstrap gates (splash hidden exactly once),
  provider stack, error boundary, status bar/theme coupling, tab bar tokens.
- `src/features/*/screens/*.test.tsx`: each placeholder renders in light and dark, asserts its
  i18n'd copy (English), the offline banner when `isOnline === false`, and its navigation targets
  (`expo-router` mocked).
- Router-level tests with `expo-router/testing-library` were not added in M1 (see open issues).

Not run on the authoring machine: simulator boots, EAS builds. Verified here: `npm run typecheck`,
`eslint`, `prettier`, `jest` for the owned paths.
