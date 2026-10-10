# Compliance and legal flags (Uzbekistan)

Everything in this file must be verified by a local lawyer before launch. Items are design
constraints the codebase already honours plus open questions.

## 1. Personal data localization

Flag: Uzbekistan's personal data law (ЗРУ-547 with 2021 amendments) requires personal data of
citizens to be processed and stored on servers physically located in Uzbekistan, with the database
registered in the State Register.

Design response: all data access is behind `src/services/*` interfaces and plain SQL migrations;
the backend can be deployed as self-hosted Supabase or vanilla Postgres inside Uzbekistan. Storage
(avatars, exports) goes through a `StorageProvider` interface. Analytics is consent-gated and
anonymised. Open question: hosting provider inside UZ and the register filing — lawyer + ops.
M2 facts: §9 (all stored data is in Postgres + Storage, both deployable in-country).

## 2. Payments and fiscal receipts

Flag: payments through Payme, Click and Uzum require merchant contracts and provider certification;
online sales must issue fiscal receipts through an OFD/fiscal module, and subscriptions must be
shown with a clear price, period and cancellation terms.

Design response: provider adapters are sandbox-first; `payments.fiscal_receipt` stores the fiscal
data returned by the provider/OFD integration; state machine + ledger support refunds and disputes.
The app never handles card data (provider-hosted flows). Open question: which OFD integration the
chosen providers supply and whether 1Heal or the venue is the fiscal seller.

## 3. SMS

Flag: SMS sender names must be registered with Eskiz and operators; OTP templates may need
pre-approval. Design response: `SmsProvider` interface; templates in one place; rate limits.

## 4. App store policies

- Subscription terms, price, renewal and cancellation are shown before purchase.
- In-app account deletion with data export (Apple and Google both require it).
- Third-party payment providers for physical services are allowed on both stores (service is
  consumed outside the app); keep that framing in the store listing.

## 5. Health-adjacent data

Visit history by category can reveal health information. Treated as sensitive: not shared with
analytics, not exported to third parties, deleted with the account, minimised in logs.

## 6. Consents

Separate, versioned consents for terms, privacy and marketing in `consents`. Location only
when-in-use; camera only in partner mode; notifications after explicit priming.

## 7. Session tokens on the device

Flag: with the Supabase auth provider, supabase-js persists the access and refresh tokens in
AsyncStorage (plain storage: app-private files on Android, the app sandbox on iOS) rather than in
the OS keychain/keystore. The refresh token is long-lived, so a rooted device or a backup extraction
could reuse it.

Design response (M1): the app-level device id and the QR token window already go through
expo-secure-store; the mock provider stores its session there too. Open item (M2): evaluate an
encrypted storage adapter for supabase-js (AES key held in SecureStore, ciphertext in AsyncStorage),
server-side refresh-token rotation and reuse detection (Supabase default), and a device list with
remote revocation (`devices.revoked_at`). Biometric lock (`profiles.biometric_lock`) is a later
milestone.

## 8. Error monitoring data leaves Uzbekistan

Flag: crash reports and performance traces go to Sentry's EU region (Frankfurt, `de.sentry.io`).
Even scrubbed, an error event carries device model, OS, app version, route names and an internal
user UUID; Sentry also derives a coarse country from the sender's IP at ingestion.

Design response: SDK off unless `EXPO_PUBLIC_SENTRY_ENABLED=true`; `sendDefaultPii: false`; phones,
e-mails, tokens, OTP codes and URL query strings scrubbed on the device before sending (unit-tested
in `src/services/observability/scrub.test.ts`); session replay only for sessions with an error and
fully masked; no health-adjacent fields (visit history, categories) are attached to events.
Recommended project settings (Sentry → Project → Security & Privacy): enable "Prevent Storing of
IP Addresses" and keep "Data Scrubber" and "Use Default Scrubbers" on for both projects.
Open question for the lawyer: whether pseudonymous diagnostics count as personal data under the
localisation rule; if yes, switch the DSN to a self-hosted Sentry/GlitchTip instance in Uzbekistan
(ADR-022 keeps this a configuration change).

## 9. Where personal data lives (facts as of M2)

Localisation (§1): every piece of member, partner and payment data the product stores lives in
one PostgreSQL database (schemas `public` and `auth`) plus Supabase Storage (avatars and data
exports, used from M7). Both run as self-hosted software, so the whole data set can be deployed
on servers inside Uzbekistan without code changes (ARCHITECTURE §6). The schema needs only
PostgreSQL 17 with standard contrib extensions, no PostGIS and no cloud-only features
(ADR-023/025), and the test suite proves that on a plain PostgreSQL on every run. Realtime
(feature flags) and Edge Functions (SMS hook) are part of the same deployment.

Flows that leave that database today:

| Flow                       | Data                                                            | Where it goes                      | Status                                  |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| OTP SMS                    | phone number, OTP text                                          | Eskiz (Uzbek SMS gateway)          | in-country provider; contract open (§3) |
| Crash/error reports        | pseudonymous diagnostics (§8)                                   | Sentry EU                          | off unless enabled; lawyer question     |
| Function and database logs | masked phone (`+99890*****67`), user UUID, IP in `sms_send_log` | the hosting provider's log storage | same host as the database               |

New flags from the M2 schema:

- `sms_send_log` keeps phone and IP for every OTP attempt (needed for the rate limits in
  ADR-028). Open item: a retention limit (proposal: delete after 30 days with a `pg_cron` job in
  M5) and mention in the privacy policy.
- `audit_log` stores before/after copies of rows of `subscriptions`, `payments`, `penalties`,
  `reviews`, `user_roles` and `venue_staff`, which reference the user. Account deletion (M7) must
  decide per table between erasure and the retention that accounting law requires for payment
  records (lawyer + accountant).
- `payment_methods.provider_token` (a provider card token, never a PAN) is readable only by the
  service role; the app cannot select the column (column-level grant, tested).
- Refresh-token rotation is on with a 10 s reuse interval in `supabase/config.toml`; cloud
  projects need the same setting in the Dashboard (RUNBOOK "Roll out migrations"). The encrypted
  token storage adapter from §7 is still open.
- The demo seed (`supabase/seed.sql`) is fictional, but its generated `+998` numbers are
  syntactically valid and may belong to real subscribers. It must never be applied to production
  and should not be shown in public material; staging seeded with it must keep `SMS_PROVIDER=mock`
  or accept that someone typing such a number would trigger a real SMS.
