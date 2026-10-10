# 1Heal — Product and engineering plan

Status: living document. Updated at the end of every milestone. Decisions with alternatives live in
`DECISIONS.md`; legal/compliance flags in `COMPLIANCE.md`; copy glossary in `COPY.md`.

## 1. Product summary

One monthly subscription → access to many partner venues in Uzbekistan (gyms, pools, yoga/pilates,
dance, martial arts, crossfit, spa/sauna/hammam, massage, physiotherapy/recovery).
Three roles in one Expo codebase (member, partner staff) plus a separate admin web app.

Core loop: discover venue → book drop-in or class → show rotating QR at the door → staff scans →
visit consumed from the monthly quota → review.

## 2. Environment matrix

| Env        | Providers                                   | Supabase project | EAS profile   | EAS Update channel |
| ---------- | ------------------------------------------- | ---------------- | ------------- | ------------------ |
| dev        | Mock SMS, Mock payments, Mock auth optional | local / dev      | `development` | `development`      |
| staging    | Eskiz test sender, Payme/Click/Uzum sandbox | staging          | `preview`     | `preview`          |
| production | Eskiz, Payme/Click/Uzum live                | production       | `production`  | `production`       |

Config enters the app only through `EXPO_PUBLIC_*` vars validated by zod in
`src/shared/config/env.ts`. Server secrets live in Supabase Edge Function env / EAS secrets.

## 3. Data model (Postgres, schema `public`, RLS deny-by-default)

Conventions: `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`,
soft-delete via `deleted_at` only where erasure is not required, money as `integer` UZS,
i18n text as `jsonb {"ru":..,"uz":..,"en":..}` with a check that `ru` exists, time as `timestamptz`
(venue timetables stored with the venue's `tz`, default `Asia/Tashkent`).

### Identity and access

| Table          | Key columns                                                                                                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`     | `id (= auth.users.id)`, `phone_e164 unique`, `full_name`, `avatar_path`, `locale enum(ru,uz,en)`, `theme enum(system,light,dark)`, `birth_date?`, `gender?`, `terms_accepted_at`, `privacy_accepted_at`, `marketing_consent_at?`, `biometric_lock bool`, `deleted_at?` |
| `user_roles`   | `user_id`, `role enum(member,partner,admin)`; a user may hold several                                                                                                                                                                                                  |
| `venue_staff`  | `venue_id`, `user_id`, `role enum(owner,staff)`, `active bool`; unique `(venue_id,user_id)`                                                                                                                                                                            |
| `devices`      | `id`, `user_id`, `platform`, `push_token?`, `app_version`, `device_name`, `last_seen_at`, `revoked_at?`                                                                                                                                                                |
| `consents`     | `user_id`, `kind enum(terms,privacy,marketing)`, `version`, `granted bool`, `at` — append-only                                                                                                                                                                         |
| `sms_send_log` | `phone_e164`, `purpose`, `provider`, `provider_msg_id?`, `status`, `ip`, `created_at` — drives rate limits                                                                                                                                                             |

### Catalog

| Table              | Key columns                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `venue_categories` | `id`, `slug unique`, `name jsonb`, `icon`, `sort`                                                                                                                                                                                                                                                                                                                                                         |
| `venues`           | `id`, `slug unique`, `name`, `description jsonb`, `category_id`, `tier smallint 1..3`, `address jsonb`, `district`, `lat`, `lng` (GiST on `ll_to_earth`, ADR-023), `phone`, `website?`, `tz`, `amenities text[]`, `women_only_hours jsonb?`, `cancellation_window_min int default 120`, `price_tier smallint 1..3`, `rating_avg numeric`, `rating_count int`, `status enum(draft,active,paused,archived)` |
| `venue_photos`     | `venue_id`, `path`, `sort`, `blurhash`                                                                                                                                                                                                                                                                                                                                                                    |
| `venue_hours`      | `venue_id`, `weekday 0..6`, `opens time`, `closes time`, `women_only bool`                                                                                                                                                                                                                                                                                                                                |
| `trainers`         | `id`, `venue_id`, `name`, `photo_path?`, `specialties text[]`, `bio jsonb`                                                                                                                                                                                                                                                                                                                                |
| `class_templates`  | `id`, `venue_id`, `name jsonb`, `description jsonb`, `duration_min`, `capacity`, `trainer_id?`, `level`, `active`                                                                                                                                                                                                                                                                                         |
| `class_sessions`   | `id`, `template_id`, `venue_id` (denormalised), `starts_at`, `ends_at`, `capacity`, `booked_count`, `waitlist_count`, `status enum(scheduled,cancelled,completed)`; index `(venue_id, starts_at)`                                                                                                                                                                                                         |
| `favorites`        | `user_id`, `venue_id`, PK both                                                                                                                                                                                                                                                                                                                                                                            |

### Subscriptions and money

| Table                  | Key columns                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plans`                | `id`, `code enum(basic,standard,premium)`, `name jsonb`, `price_uzs int`, `visits_per_month int`, `max_venue_tier smallint`, `per_venue_monthly_cap int`, `perks jsonb`, `active`, `sort`                                                                                                                         |
| `subscriptions`        | `id`, `user_id`, `plan_id`, `status enum(pending_payment,active,past_due,frozen,cancelled,expired)`, `period_start`, `period_end`, `auto_renew bool`, `visits_used int`, `cancel_at?`, `frozen_until?`, `scheduled_plan_id?` (downgrade at renewal); partial unique index: one non-terminal subscription per user |
| `subscription_freezes` | `id`, `subscription_id`, `starts_at`, `ends_at`, `created_by`; rule: ≤1 per calendar quarter, ≤30 days                                                                                                                                                                                                            |
| `subscription_events`  | append-only ledger: `subscription_id`, `type`, `payload jsonb`, `actor`, `created_at`                                                                                                                                                                                                                             |
| `payments`             | `id`, `user_id`, `subscription_id?`, `provider enum(payme,click,uzum,mock)`, `provider_txn_id?`, `amount_uzs`, `status enum(created,pending,paid,failed,refunded,disputed)`, `idempotency_key unique`, `paid_at?`, `receipt_url?`, `fiscal_receipt jsonb?`, `metadata jsonb`                                      |
| `payment_events`       | append-only: `payment_id`, `from_status`, `to_status`, `source enum(client,webhook,admin,system)`, `raw jsonb`, `created_at`                                                                                                                                                                                      |
| `payment_methods`      | `id`, `user_id`, `provider`, `provider_token`, `masked_pan`, `expiry`, `is_default`; the app never sees PAN                                                                                                                                                                                                       |
| `webhook_inbox`        | `provider`, `external_id`, `payload`, `received_at`, `processed_at?`, unique `(provider, external_id)` → idempotent webhooks                                                                                                                                                                                      |
| `payouts`              | `venue_id`, `period_start`, `period_end`, `visits_count`, `amount_uzs`, `status enum(draft,approved,paid)`                                                                                                                                                                                                        |

### Booking and visits

| Table              | Key columns                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bookings`         | `id`, `user_id`, `venue_id`, `subscription_id`, `class_session_id?` (null = drop-in), `starts_at`, `ends_at`, `status enum(confirmed,waitlisted,cancelled,checked_in,no_show,expired)`, `waitlist_position?`, `idempotency_key unique`, `cancelled_at?`, `cancel_reason?`, `calendar_event_id?`; unique partial `(user_id, class_session_id) where status in (confirmed,waitlisted)` |
| `booking_events`   | append-only ledger                                                                                                                                                                                                                                                                                                                                                                   |
| `visits`           | `id`, `user_id`, `venue_id`, `booking_id?`, `subscription_id`, `checked_in_at`, `method enum(qr,manual)`, `staff_user_id`, `manual_reason?`, `qr_jti?`; unique `(booking_id)`; unique `(qr_jti)`                                                                                                                                                                                     |
| `qr_tokens`        | `jti uuid PK`, `user_id`, `device_id`, `issued_at`, `expires_at`, `used_at?`, `used_venue_id?` — single-use enforced by `update ... where used_at is null`                                                                                                                                                                                                                           |
| `checkin_attempts` | audit: `venue_id`, `staff_user_id`, `jti?`, `result_code`, `booking_id?`, `created_at`                                                                                                                                                                                                                                                                                               |
| `penalties`        | `user_id`, `kind enum(no_show_block)`, `starts_at`, `ends_at`, `source_booking_ids uuid[]`                                                                                                                                                                                                                                                                                           |

### Reviews, notifications, platform

| Table                       | Key columns                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `reviews`                   | `id`, `user_id`, `venue_id`, `visit_id unique`, `rating 1..5`, `text`, `status enum(published,hidden,under_review)`             |
| `review_reports`            | `review_id`, `reporter_id`, `reason`, `resolved_at?`, `resolution?`                                                             |
| `notifications`             | `user_id`, `kind`, `title jsonb`, `body jsonb`, `data jsonb`, `sent_at?`, `read_at?`                                            |
| `notification_preferences`  | `user_id`, `bookings bool`, `reminders bool`, `marketing bool`, `quiet_hours jsonb?`                                            |
| `feature_flags`             | `key PK`, `enabled bool`, `payload jsonb`, `audience jsonb` (percent rollout / role / user ids)                                 |
| `audit_log`                 | `actor_id?`, `actor_role`, `action`, `entity`, `entity_id`, `before jsonb?`, `after jsonb?`, `created_at` — written by triggers |
| `account_deletion_requests` | `user_id`, `requested_at`, `export_requested bool`, `export_path?`, `completed_at?`                                             |

### Derived rules (server-side only)

- `remaining_visits(sub) = plan.visits_per_month - sub.visits_used`, period-scoped.
- Venue access: `venue.tier <= plan.max_venue_tier`.
- Per-venue cap: `count(visits in period at venue) < plan.per_venue_monthly_cap`.
- Cancellation: free if `now() < booking.starts_at - venue.cancellation_window_min`; later cancellation
  consumes the visit (`status=cancelled`, `visit_consumed=true` via ledger).
- No-show: booking not checked-in by `ends_at` → `no_show`, visit consumed. 3 no-shows in 30 days →
  `penalties` row blocking bookings for 7 days (both numbers in `feature_flags.payload`).
- Waitlist promotion: on cancellation of a confirmed class booking, the lowest `waitlist_position`
  becomes `confirmed` inside the same transaction; push sent by the `notify` Edge Function.
- Freeze: `status=frozen`, `period_end` extended by freeze length on unfreeze; ≤1 per quarter, ≤30 d.
- Proration on plan change: upgrade immediate, charge `(new.price - old.price) * remaining_days/period_days`;
  downgrade scheduled for next renewal (`scheduled_plan_id`).

## 4. API surface

All mutations are `security definer` SQL functions (`rpc_*`) or Edge Functions (`fn-*`). The app
talks only through `src/services/api` which wraps Supabase and can be swapped.

### SQL RPC (transactional, row-locked)

| Function                                                                                                  | Guarantees                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `rpc_book(p_venue, p_session?, p_starts_at?, p_idempotency_key)`                                          | locks subscription + session rows; checks quota, tier, per-venue cap, penalties, overlap; confirms or waitlists |
| `rpc_cancel_booking(p_booking, p_reason?)`                                                                | applies cancellation window; promotes waitlist atomically                                                       |
| `rpc_mark_no_show(p_booking)` / cron `fn_expire_bookings()`                                               | consumes visit, evaluates penalty rule                                                                          |
| `rpc_checkin(p_jti, p_venue, p_staff)`                                                                    | single-use token claim (`update ... returning`), all eligibility checks, writes `visits` + audit                |
| `rpc_manual_checkin(p_user, p_venue, p_staff, p_reason)`                                                  | staff-only, reason mandatory, audit                                                                             |
| `rpc_change_plan(p_plan)` / `rpc_freeze(p_from, p_to)` / `rpc_set_auto_renew` / `rpc_cancel_subscription` | ledger rows, invariants                                                                                         |
| `rpc_submit_review(p_visit, p_rating, p_text)` / `rpc_report_review`                                      | only own completed visit, one per visit                                                                         |
| `rpc_request_deletion(p_export)` / `rpc_partner_today(p_venue, p_date)` / `rpc_partner_stats`             | role-checked                                                                                                    |
| `rpc_nearby_venues(p_lat, p_lng, p_radius_m, p_category, p_open_now, p_limit)`                            | earthdistance (ADR-023), returns `distance_m`                                                                   |

### Edge Functions (Deno)

| Function                              | Purpose                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `auth-sms-hook`                       | Supabase "Send SMS" auth hook → `SmsProvider` (Eskiz / Mock), rate limits per phone and IP         |
| `qr-issue`                            | signs rotating QR tokens (HMAC/Ed25519, jti, user, device, exp 45 s); returns a window of 3 tokens |
| `qr-verify`                           | partner scanner endpoint: verifies signature + TTL, then `rpc_checkin`; returns reason code        |
| `payments-create`                     | creates `payments` row, calls provider adapter → checkout URL / deep link                          |
| `payments-webhook-{payme,click,uzum}` | verifies provider signature, writes `webhook_inbox`, drives the state machine idempotently         |
| `notify`                              | push fan-out (expo-notifications), reads `notification_preferences`                                |
| `cron-*`                              | expire bookings, renew subscriptions, promote waitlists, clean QR tokens, process deletions        |
| `export-data`                         | builds a JSON/CSV archive in Storage with a signed URL                                             |

## 5. Screen map (Expo Router)

```
app/
  _layout.tsx                      providers, fonts, theme, i18n, query client, auth gate (Stack.Protected)
  (public)/
    onboarding.tsx                 3 slides + permission priming
    sign-in.tsx                    phone input (+998 XX XXX XX XX)
    verify.tsx                     OTP input, resend timer, lockout state
    legal/[doc].tsx                terms / privacy (public)
  (member)/
    (tabs)/
      index.tsx                    Home: greeting, remaining visits, next booking, nearby, categories, recommended
      discover.tsx                 list/map toggle, search, filters sheet, sort, saved filters
      bookings.tsx                 upcoming / past, waitlist state
      qr.tsx                       rotating QR, offline token window, states
      profile.tsx                  profile hub
    venue/[id].tsx                 gallery, info, hours, timetable, trainers, reviews, map, favorite, share
    venue/[id]/timetable.tsx
    booking/new.tsx                drop-in or class slot → confirm (quota preview from src/domain)
    booking/[id].tsx               detail, cancel, add to calendar
    subscription/index.tsx         current plan, usage, freeze, auto-renew, cancel, history
    subscription/plans.tsx         compare Basic/Standard/Premium, upgrade/downgrade with proration preview
    subscription/checkout.tsx      provider choice (Payme/Click/Uzum), result states
    profile/edit.tsx, language.tsx, theme.tsx, notifications.tsx, favorites.tsx, history.tsx,
    profile/stats.tsx, support.tsx, delete-account.tsx, legal/[doc].tsx
    reviews/new.tsx                after a completed visit
  (partner)/
    (tabs)/
      scan.tsx                     camera scanner, huge success/fail screens, reason codes, haptics + sound
      today.tsx                    bookings, rosters, waitlists, manual check-in (reason), no-show
      stats.tsx                    today/week/month, no-shows, estimated payout, top classes
      venue-settings.tsx           staff list (owner), cancellation window
  dev/gallery.tsx                  component gallery (dev builds only)
  +not-found.tsx
```

Every screen renders: loading (skeleton), empty, error (retry), offline (cached + banner), and
permission-denied (camera/location/notifications) states.

## 6. State machines

### Payment

```
created ─▶ pending ─▶ paid ─▶ refunded
   │          │         └───▶ disputed ─▶ refunded
   └──────────┴─▶ failed
```

Transition table (`src/domain/payments/stateMachine.ts`, mirrored in SQL trigger):
`created→pending|failed`, `pending→paid|failed`, `paid→refunded|disputed`, `disputed→refunded|paid`.
Anything else raises. Every transition inserts `payment_events`. Webhooks are idempotent by
`(provider, external_id)` in `webhook_inbox`.

### Booking

```
confirmed ─▶ checked_in
    │ ─▶ cancelled (free or consumed)
    │ ─▶ no_show (cron after ends_at)
waitlisted ─▶ confirmed (promotion) | cancelled | expired (session started)
```

### Subscription

```
pending_payment ─▶ active ─▶ frozen ─▶ active
                     │ ─▶ past_due ─▶ active | expired
                     │ ─▶ cancelled (at period_end) ─▶ expired
```

### QR token

```
issued (exp 45 s) ─▶ used (exactly once) | expired
```

### Check-in reason codes

`OK`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_USED`, `NO_ACTIVE_SUBSCRIPTION`, `SUBSCRIPTION_FROZEN`,
`QUOTA_EXCEEDED`, `VENUE_CAP_EXCEEDED`, `TIER_NOT_ALLOWED`, `BOOKING_REQUIRED`, `BOOKING_MISMATCH`,
`PENALTY_ACTIVE`, `VENUE_CLOSED`, `ALREADY_CHECKED_IN_TODAY`, `DEVICE_MISMATCH`.

## 7. Milestones and gates

Status (2026-10-09): **M1 done** — merged to `main`; gates observed: typecheck, lint, prettier,
Jest (90 suites), `expo export --platform web`, and a manual walkthrough in the web preview
(onboarding → sign-in → OTP → member tabs → language/theme switch → partner mode → sign-out).
Not observed locally: iOS/Android simulator boot, Maestro flows, EAS builds (CI carries them).

Status (2026-10-10): **M2 done**, merged to `main`. Schema 0001–0010 + 0090 with RLS on every table,
triggers, ledgers, `rpc_nearby_venues` / `rpc_venue_is_open`, roles via the access-token hook, the
Send-SMS hook, a deterministic seed (30 venues, 3 plans, 106 users) and generated types wired into
a typed client and the remote feature-flag provider. Gates observed on the authoring machine:
`npm run check` (typecheck, typecheck:db, lint, Jest 93 suites / 718 tests), `npm run db:test` on
the embedded PostgreSQL 17 (22 suites / 194 tests, incl. RLS per role, seed and Edge Function
logic), `npx prettier --check .`, `node supabase/seed/generate.mjs --check`, and a byte-stable
`npm run db:types`. pgTAP was replaced by TypeScript DB tests (ADR-024). Not observed locally: the
DB suite against Supabase local, the types drift check in CI and serving the Edge Function (no
Docker/Deno; CI job `db` carries the first two). Next: M3 Discovery.

| Milestone                   | Deliverables                                                                                                                                                   | Gates                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| M1 Foundation               | repo, tooling, tokens/theme, typography, component library + gallery, i18n (ru/uz/en), navigation shell, onboarding, auth with mock OTP, logo/icons/splash, CI | typecheck, lint, unit (incl. contrast + architecture tests), web boot observed |
| M2 Data                     | migrations, enums, RLS, triggers, seed (25+ venues, 3 plans, 100 members), generated types, DB tests (ADR-024)                                                 | DB tests in CI; RLS tests per role                                             |
| M3 Discovery                | home, discover list/map, filters, venue page, favorites, map adapters                                                                                          | + e2e smoke (Maestro), performance check on lists                              |
| M4 Subscriptions & payments | plans, provider adapters (sandbox), webhooks, ledger, state-machine tests, receipts                                                                            | + state machine + idempotency tests                                            |
| M5 Booking                  | classes, capacity, waitlist, cancellation, penalties, calendar export, concurrency tests                                                                       | + 50-parallel-bookings test                                                    |
| M6 Check-in                 | rotating QR, partner scanner, verification, audit, double-scan test                                                                                            | + double-scan test                                                             |
| M7 Profile                  | profile, reviews, notifications, deletion + export                                                                                                             | + deletion e2e                                                                 |
| M8 Admin & release          | admin app, analytics, a11y + perf + security audits, store readiness, EAS submit config                                                                        | full gate set                                                                  |

Gate rule: if a gate cannot run on the authoring machine (simulators, Docker, EAS), the milestone
report states it and the CI workflow carries it.

## 8. Risk register

| #   | Risk                                                                                 | Impact | Mitigation                                                                                                     |
| --- | ------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------- |
| R1  | Personal-data localization law may require hosting inside Uzbekistan                 | High   | All provider access behind interfaces; migrations are plain SQL; self-hosted Supabase/Postgres path documented |
| R2  | Payment providers (Payme/Click/Uzum) need contracts, certification and fiscalization | High   | Sandbox adapters first; fiscal receipt field in `payments`; flagged in COMPLIANCE.md                           |
| R3  | SMS sender name registration with Eskiz / operators takes time                       | Medium | Mock provider in dev; `auth-sms-hook` is provider-agnostic                                                     |
| R4  | Map coverage: Google vs Yandex in Uzbekistan                                         | Medium | Map abstraction; adapter spike in M3                                                                           |
| R5  | Concurrency bugs in booking/check-in                                                 | High   | Row locks + unique constraints + idempotency keys; explicit concurrency tests                                  |
| R6  | Store policies: subscription disclosure, account deletion                            | Medium | In-app deletion, clear pricing screens, review notes checklist in M8                                           |
| R7  | Authoring machine cannot run simulators/Docker/EAS                                   | Medium | CI carries those gates; reports state what was not observed                                                    |
| R8  | Repository path contains spaces and non-ASCII characters                             | Low    | Builds happen on EAS; if local native builds are needed, clone to an ASCII path                                |
| R9  | Expo SDK 57 / TS 6 are newer than the authors' training data                         | Medium | Versioned docs consulted before using any API; typecheck + lint on every change                                |
| R10 | Weak connectivity at venues                                                          | Medium | Pre-fetched QR token window, persisted queries, explicit offline states                                        |
