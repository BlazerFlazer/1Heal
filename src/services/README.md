# src/services

Every external provider sits behind an interface here so feature code never imports a vendor SDK.
Swapping Supabase for self-hosted Postgres, or Yandex for Google maps, touches only this folder.

| Folder     | Interface / entry point                                                 | Adapters                                                                                               |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `auth/`    | `AuthService`, `getAuthService()`, `useAuthStore`, `useAuthBootstrap()` | `MockAuthService` (dev), `SupabaseAuthService`                                                         |
| `api/`     | `getSupabaseClient()` (lazy singleton), `isSupabaseConfigured()`        | supabase-js over AsyncStorage, AppState-driven refresh                                                 |
| `storage/` | `JsonStorage` (`getJson(key, zodSchema)`, `setJson`, `remove`)          | `secureStorage` (expo-secure-store, chunked at 2 KB; localStorage on web), `appStorage` (AsyncStorage) |
| `query/`   | `createQueryClient()`, `<QueryProvider>`                                | TanStack Query persisted to AsyncStorage, offline-first                                                |
| `network/` | `useNetworkStatus()`, `connectOnlineManager()`                          | expo-network                                                                                           |
| `session/` | `useOnboardingStore`                                                    | zustand `persist` over AsyncStorage                                                                    |

Keys for anything persisted live in `storage/storageKeys.ts`. Every read is validated with zod;
a value that fails validation is removed and treated as missing.

## Auth

`AuthService` is phone + SMS OTP: `requestOtp` → `verifyOtp` → `Session` (`userId`, `phoneE164`,
tokens, `expiresAt`, `roles`, `deviceId`, `profile`). Errors are always `AuthError` with a `code`
(`INVALID_PHONE | INVALID_CODE | CODE_EXPIRED | TOO_MANY_REQUESTS | LOCKED | NETWORK | UNKNOWN`)
and, for the throttling codes, `retryAfterSec`. Screens switch on the code and translate it.

`useAuthBootstrap()` (root layout) restores the session, follows auth events and exposes
`status: 'bootstrapping' | 'signedOut' | 'signedIn'`. `activeMode` (`member | partner`) is
persisted and silently falls back to `member` whenever the session lacks the partner role.

### Switching mock → Supabase

1. `.env`: `EXPO_PUBLIC_AUTH_PROVIDER=supabase`, `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (env validation fails fast if either is missing).
2. Roles come from the JWT claim `app_metadata.roles`, written by the custom access-token hook
   from `user_roles` (M2). Without the claim every user is `['member']`.
3. `SUPABASE_OTP_RESEND_AFTER_SEC` / `SUPABASE_OTP_EXPIRES_IN_SEC` in `SupabaseAuthService.ts` are
   display hints and must match `[auth.sms]` in `supabase/config.toml`.

### Dev conventions (mock provider)

- Any valid Uzbek mobile number signs in with the code **123456** (`MOCK_OTP_CODE`).
- Phones ending in **00** (e.g. `+998 90 123 45 00`) also get the `partner` role;
  `+998 90 000 00 00` is additionally `admin`.
- Limits mirror production: 30 s resend cooldown, 3 requests / 10 min, 5 wrong codes → 15 min lock,
  codes expire after 5 min, sessions last 1 h and are rotated on refresh.
- Simulated latency is 400 ms; pass `{ latencyMs: 0 }` in tests.
