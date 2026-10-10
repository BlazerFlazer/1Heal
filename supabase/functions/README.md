# Edge Functions

Deno functions deployed to Supabase. Logic lives in runtime-agnostic TypeScript under `_shared/`
(plain `fetch`, Web Crypto, no Deno globals) so Jest can test it in Node. Each function directory
holds a thin `index.ts` that is the only code touching `Deno.*`.

| Path                                | What                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `auth-sms-hook/index.ts`            | Supabase Auth "Send SMS" hook entry (`Deno.serve`, env, wiring)               |
| `_shared/hooks/sendSmsHook.ts`      | `handleSendSms`: signature, payload, rate limits, template, send, log         |
| `_shared/hooks/standardWebhooks.ts` | Standard Webhooks verification (HMAC-SHA256, 5 min tolerance, rotation)       |
| `_shared/hooks/sendSmsPayload.ts`   | Hand-written validator for the hook payload (no zod in Deno by default)       |
| `_shared/hooks/rateLimiter.ts`      | `RateLimiter` / `SmsSendLog` interfaces, `InMemorySmsLog` for tests           |
| `_shared/hooks/restSmsLog.ts`       | Postgres implementation through the Data API (service role)                   |
| `_shared/hooks/smsTemplates.ts`     | OTP text per locale (`ru` default, `uz`, `en`) with the brand constant        |
| `_shared/sms/*`                     | `SmsProvider`, `SmsError`, `EskizSmsProvider`, `MockSmsProvider`, factory     |
| `_shared/brand.ts`                  | `BRAND_NAME`, mirrors `src/shared/config/brand.ts` (a test checks they match) |
| `deno.json`                         | Import map that lets Deno resolve the extensionless relative imports          |

## Module resolution

The sources use extensionless relative imports, which `tsc -p tsconfig.db.json` and Jest resolve.
Deno does not guess extensions, so `deno.json` maps every `_shared` module exactly
(`"./_shared/log": "./_shared/log.ts"`). The Supabase CLI only picks up a per-function `deno.json`
on its own, so point each function at the shared one in `supabase/config.toml`:

```toml
[functions.auth-sms-hook]
verify_jwt = false
import_map = "./functions/deno.json"
```

or pass `--import-map supabase/functions/deno.json` to `supabase functions serve|deploy`.
`supabase/tests/functions/denoImportMap.test.ts` fails when a new module is imported without an
entry, or when a `_shared` file uses `Deno.*`, `npm:`, `jsr:` or URL imports.

## auth-sms-hook

Flow per request: verify the `webhook-*` headers against `SEND_SMS_HOOK_SECRET` → validate
`{ user: { id, phone, user_metadata.locale? }, sms: { otp }, metadata?: { ip_address? } }` →
`sms_rate_limit_check` → render the OTP text in the user's locale → `SmsProvider.send` → insert a
`sms_send_log` row (`sent`, `failed` or `rate_limited`) → answer Auth.

Answers, following the Auth hook client (`supabase/auth` `internal/hooks/hookshttp`):

| Situation                        | HTTP      | Body                                     | What the app sees           |
| -------------------------------- | --------- | ---------------------------------------- | --------------------------- |
| Delivered                        | 200       | `{}`                                     | OTP screen                  |
| Our rate limit                   | 200       | `{ error: { http_code: 429, message } }` | 429 with "after N seconds"  |
| Provider says the number is bad  | 200       | `{ error: { http_code: 400, message } }` | 400                         |
| Provider auth or unknown failure | 200       | `{ error: { http_code: 500, message } }` | 500                         |
| Provider down / throttled        | 503       | `retry-after: 1`                         | Auth retries (3 tries, 5 s) |
| Rate limiter unreachable         | 503       | `retry-after: 1` (fails closed)          | Auth retries, then 500      |
| Bad signature / bad payload      | 401 / 400 | error body                               | generic 500                 |

Extra limits on top of Auth's own (`[auth.sms] max_frequency`, `[auth.rate_limit] sms_sent`),
counted over `sms_send_log` rows with status `sent` or `failed`:

| Scope | Limit           | Rule        |
| ----- | --------------- | ----------- |
| phone | 3 in 10 minutes | `phone_10m` |
| phone | 10 in 24 hours  | `phone_24h` |
| IP    | 20 in 1 hour    | `ip_1h`     |

The source of truth is `public.sms_rate_limit_check` in
`supabase/migrations/0090_sms_send_log_policies.sql`; `SMS_RATE_LIMITS` mirrors it for unit tests.
The check and the insert are separate statements, so two simultaneous requests for one phone can
both pass; Auth's own per-phone `max_frequency` (60 s) covers that gap.

Logs are one JSON object per line: `{ level, event, phone_masked, provider, ms, ... }`, e.g.
`sms_sent`, `sms_rate_limited`, `sms_send_failed`, `sms_hook_signature_rejected`. Phones are
masked (`+99890*****67`) and OTPs are never logged, except by `MockSmsProvider`, which prints the
text on purpose so a developer can read the code locally.

### Environment

| Variable                                    | Required     | Notes                                                                                                                                         |
| ------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `SEND_SMS_HOOK_SECRET`                      | yes          | `v1,whsec_<base64>`, same value as the hook secret in Auth; several separated by `\|` while rotating. `SEND_SMS_HOOK_SECRETS` is accepted too |
| `SMS_PROVIDER`                              | no (`mock`)  | `mock` or `eskiz`                                                                                                                             |
| `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`             | with `eskiz` | Eskiz cabinet credentials                                                                                                                     |
| `ESKIZ_FROM`                                | no (`4546`)  | Registered sender name; `4546` is Eskiz's shared test sender                                                                                  |
| `ESKIZ_CALLBACK_URL`                        | no           | Delivery-status callback, sent as `callback_url`                                                                                              |
| `ESKIZ_BASE_URL`                            | no           | Defaults to `https://notify.eskiz.uz/api`                                                                                                     |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | injected     | Used for `rpc/sms_rate_limit_check` and the `sms_send_log` insert                                                                             |

### Run locally (Supabase CLI, needs Docker)

```bash
export SEND_SMS_HOOK_SECRETS="v1,whsec_$(openssl rand -base64 32)"   # read by config.toml
supabase start                                                     # Auth calls the hook
cat > supabase/functions/.env <<EOF
SEND_SMS_HOOK_SECRET=$SEND_SMS_HOOK_SECRETS
SMS_PROVIDER=mock
EOF
supabase functions serve auth-sms-hook --env-file supabase/functions/.env \
  --import-map supabase/functions/deno.json
```

`supabase/functions/.env` is git-ignored (`supabase/.gitignore`). Request an OTP from the app (or
`POST /auth/v1/otp` with a phone) and read the code from the `sms_mock_sent` log line. Numbers in
`[auth.sms.test_otp]` never reach the hook: Auth accepts their fixed code without sending.

Without Docker (this authoring machine) the hook cannot be served; its logic is covered by
`npm run db:test` (`supabase/tests/functions/*`), including a database test of
`sms_rate_limit_check` on the embedded PostgreSQL.

### Rotate the hook secret

The function accepts every secret listed in `SEND_SMS_HOOK_SECRET` (separated by `|`), so a
rotation has no window where valid requests fail:

1. Generate the new secret: `v1,whsec_$(openssl rand -base64 32)`.
2. `supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_NEW|v1,whsec_OLD'`.
3. Put the new secret on the Auth side: Dashboard → Authentication → Hooks → Send SMS (cloud), or
   `SEND_SMS_HOOK_SECRETS` for `supabase/config.toml` (local, CI).
4. Once Auth signs with the new secret, `supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_NEW'`.

### Switch from mock to Eskiz

```bash
supabase secrets set SMS_PROVIDER=eskiz ESKIZ_EMAIL=... ESKIZ_PASSWORD=... ESKIZ_FROM=<sender>
```

Secrets apply to new invocations without a redeploy. Before going live, register the sender name
with Eskiz and the mobile operators and get the OTP texts in `_shared/hooks/smsTemplates.ts`
approved; until then Eskiz may reject or rewrite messages (docs/COMPLIANCE.md §3). The shared test
sender `4546` is for the test period only.

### Eskiz contract

Base `https://notify.eskiz.uz/api`: `POST /auth/login` (`email`, `password` → `data.token`, a JWT
cached until its `exp`), `PATCH /auth/refresh` (Bearer, on a 401 from send, then one retry),
`POST /message/sms/send` (multipart form `mobile_phone` digits without `+`, `message`, `from`,
`callback_url?`, Bearer). Paths, methods and field names follow the open-source Go SDK
[realtemirov/eskizuz](https://github.com/realtemirov/eskizuz) (`main.go`) and the official Postman
collection linked from its README
([documenter.getpostman.com/view/663428/RzfmES4z](https://documenter.getpostman.com/view/663428/RzfmES4z)).
The success body (`id`, `status`) and the error-to-`SmsError` mapping for 400/422 are not verified
against the live API and are marked `// PROVIDER-STUB` in `EskizSmsProvider.ts`.

## References

- Standard Webhooks spec: https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
- Send SMS hook: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- Auth hook HTTP client: https://github.com/supabase/auth/blob/master/internal/hooks/hookshttp/hookshttp.go
- Function dependencies and import maps: https://supabase.com/docs/guides/functions/dependencies
