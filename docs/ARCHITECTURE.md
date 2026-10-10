# 1Heal — database architecture (M2)

Schema `public` on Supabase Postgres 17 (and the embedded PostgreSQL used by `npm run db:test`).
Migrations: `supabase/migrations/0001…0009` (M2 schema), `0090+` reserved for the SMS hook.
Tests: `supabase/tests/schema/*.test.ts`. Runbook: `docs/RUNBOOK.md` ("Database").

## 1. ER diagram

```mermaid
erDiagram
  auth_users ||--|| profiles : "trigger creates"
  profiles ||--o{ user_roles : has
  profiles ||--o{ venue_staff : "works at"
  venues ||--o{ venue_staff : employs
  profiles ||--o{ devices : owns
  profiles ||--o{ consents : "append-only"
  venue_categories ||--o{ venues : categorises
  venues ||--o{ venue_photos : has
  venues ||--o{ venue_hours : has
  venues ||--o{ trainers : has
  venues ||--o{ class_templates : offers
  trainers o|--o{ class_templates : leads
  class_templates ||--o{ class_sessions : schedules
  venues ||--o{ class_sessions : hosts
  profiles ||--o{ favorites : marks
  venues ||--o{ favorites : "marked in"
  plans ||--o{ subscriptions : "priced by"
  profiles ||--o{ subscriptions : holds
  subscriptions ||--o{ subscription_freezes : pauses
  subscriptions ||--o{ subscription_events : "ledger"
  profiles ||--o{ payments : pays
  subscriptions o|--o{ payments : "for"
  payments ||--o{ payment_events : "ledger"
  profiles ||--o{ payment_methods : saves
  venues ||--o{ payouts : earns
  profiles ||--o{ bookings : makes
  venues ||--o{ bookings : receives
  subscriptions ||--o{ bookings : consumes
  class_sessions o|--o{ bookings : "seat in"
  bookings ||--o{ booking_events : "ledger"
  bookings o|--o| visits : "checked in as"
  profiles ||--o{ visits : attends
  venues ||--o{ visits : hosts
  profiles ||--o{ qr_tokens : shows
  devices o|--o{ qr_tokens : "issued to"
  qr_tokens o|--o| visits : claims
  venues ||--o{ checkin_attempts : logs
  profiles ||--o{ penalties : blocked
  visits ||--o| reviews : "one per visit"
  venues ||--o{ reviews : rated
  reviews ||--o{ review_reports : reported
  profiles ||--o{ notifications : receives
  profiles ||--o| notification_preferences : sets
  profiles ||--o{ account_deletion_requests : requests
```

Standalone: `sms_send_log` (rate limits, written by the SMS hook), `webhook_inbox` (idempotent
provider callbacks), `feature_flags`, `audit_log` (written by triggers).

## 2. Conventions

- `id uuid primary key default gen_random_uuid()`; `created_at`/`updated_at timestamptz`; the
  shared trigger `set_updated_at` is attached by `public.ensure_updated_at_triggers()` at the end
  of each migration to every table that has `updated_at`.
- Ledgers (`subscription_events`, `payment_events`, `booking_events`, `audit_log`) are append-only
  and carry `seq bigint identity` for a stable order inside one transaction.
- Money is integer UZS (`*_uzs`). Phones are E.164 text with a check (`+998XXXXXXXXX`).
- i18n text is `jsonb {"ru","uz","en"}` checked by `public.jsonb_i18n_valid()` (`ru` required,
  non-empty); optional descriptions/bios only require an object.
- Enums are Postgres enum types (`user_role`, `app_locale`, `app_theme`, `gender`,
  `venue_staff_role`, `consent_kind`, `device_platform`, `venue_status`, `session_status`,
  `class_level`, `plan_code`, `subscription_status`, `payment_provider`, `payment_status`,
  `payment_event_source`, `payout_status`, `booking_status`, `visit_method`, `penalty_kind`,
  `review_status`), created in idempotent `do` blocks.
- Geo: `venues.lat/lng double precision` + GiST index on `ll_to_earth(lat, lng)` (cube +
  earthdistance, available on Supabase and the embedded cluster). No PostGIS.
- Extensions are created in schema `extensions` when it exists (Supabase), else `public`;
  `pg_cron` only where available. No cron jobs are scheduled yet (M5 adds them).
- User references point at `public.profiles(id)` (cascade from `auth.users`), so generated types
  carry the relationships and joins work through PostgREST.
- Roles come from the JWT claim `app_metadata.roles`, written by
  `public.custom_access_token_hook` from `user_roles` (ADR-013). A role change takes effect on the
  next token refresh (≤ `jwt_expiry`, 1 h); revoking an admin immediately requires a sign-out
  (session deletion) in addition to deleting the row.
- Helper functions used in policies: `current_user_id()`, `app_role()`, `has_role(text)`,
  `is_admin()`, `is_venue_staff(uuid)`, `is_venue_owner(uuid)`, `venue_is_active(uuid)`; the
  table-reading ones are `security definer` with a pinned `search_path` to avoid RLS recursion.
- `venue_hours.weekday`: 0 = Sunday … 6 = Saturday (`extract(dow)`); `closes <= opens` means an
  overnight slot that ends on the next day. `rpc_venue_is_open(venue, at)` evaluates in the venue's
  `tz`.

## 3. Triggers and server rules present in M2

| Trigger                                                                                                                | Rule                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.users` insert → `handle_new_auth_user`                                                                           | creates `profiles` (`phone_e164 = '+' ‖ phone`, `full_name` from metadata) and `user_roles(member)`                                                     |
| `auth.users` update of phone                                                                                           | keeps `profiles.phone_e164` in sync                                                                                                                     |
| `payments` before update of status                                                                                     | `enforce_payment_transition`: created→pending/failed, pending→paid/failed, paid→refunded/disputed, disputed→refunded/paid; else `P0001`; sets `paid_at` |
| `payments` after insert/update of status                                                                               | `log_payment_event` → `payment_events` (source from `oneheal.payment_event_source` setting, admin JWT, no JWT = system, else client)                    |
| `subscriptions` after insert/update of status                                                                          | `subscription_events` (`created`, `status_changed`)                                                                                                     |
| `bookings` after insert/update of status                                                                               | `booking_events` (`created`, `status_changed`)                                                                                                          |
| `reviews` after insert/update/delete                                                                                   | `venues.rating_avg/rating_count` over published reviews                                                                                                 |
| `reviews` before update                                                                                                | members may change only `rating` and `text` (else `42501`); RLS adds the 24 h window                                                                    |
| `audit` on venues, venue_staff, user_roles, plans, subscriptions, payments, payouts, penalties, feature_flags, reviews | `write_audit` → `audit_log` (actor from the JWT, before/after rows)                                                                                     |

Constraints worth knowing: one non-terminal subscription per user (partial unique on `user_id`
where status not in cancelled/expired); one live booking per user and session (partial unique);
`visits.booking_id` and `visits.qr_jti` unique; `reviews.visit_id` unique; freezes ≤ 30 days;
`webhook_inbox (provider, external_id)` unique; `payments.idempotency_key` and
`(provider, provider_txn_id)` unique; one open `account_deletion_requests` per user.

## 4. RLS matrix

Every table has RLS enabled (asserted automatically by `rls-coverage.test.ts`, which also pins the
list of tables anon may read). `anon`/`authenticated` start with no table grants; `service_role`
has all grants and bypasses RLS. "—" = no grant. "owner" = `user_id = auth.uid()`.
"rpc" = writes arrive only through security definer `rpc_*` functions or Edge Functions (M5–M7).

| Table                                                    | anon                | authenticated read                                                         | authenticated write                                                         |
| -------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| profiles                                                 | —                   | own row; admin all                                                         | update own row; admin all                                                   |
| user_roles                                               | —                   | own rows; admin all; `supabase_auth_admin` all (hook)                      | admin                                                                       |
| venue_staff                                              | —                   | own rows; venue owner their venue; admin                                   | venue owner (their venue); admin                                            |
| devices                                                  | —                   | owner                                                                      | owner (insert/update/delete)                                                |
| consents                                                 | —                   | owner; admin                                                               | owner insert (append-only)                                                  |
| sms_send_log                                             | —                   | admin                                                                      | — (service role)                                                            |
| venue_categories                                         | read                | read                                                                       | admin                                                                       |
| venues                                                   | `status = active`   | active, or own venue (staff), or admin                                     | insert/delete admin; update venue owner or admin                            |
| venue_photos, venue_hours, class_sessions                | of active venues    | of active venues; staff their venue; admin                                 | venue staff; admin                                                          |
| trainers, class_templates                                | active of active v. | same + staff/admin                                                         | venue staff; admin                                                          |
| favorites                                                | —                   | owner                                                                      | owner insert/delete                                                         |
| plans                                                    | `active`            | active; admin all                                                          | admin                                                                       |
| subscriptions, subscription_freezes, subscription_events | —                   | owner (via subscription); admin                                            | rpc                                                                         |
| payments, payment_events                                 | —                   | owner (via payment); admin                                                 | rpc                                                                         |
| payment_methods                                          | —                   | owner, columns without `provider_token` (select explicit columns, not `*`) | owner update `is_default`, delete; insert via rpc                           |
| webhook_inbox                                            | —                   | admin                                                                      | — (service role)                                                            |
| payouts                                                  | —                   | venue owner; admin                                                         | — (service role)                                                            |
| bookings, booking_events                                 | —                   | owner; venue staff (their venue); admin                                    | rpc                                                                         |
| visits, checkin_attempts                                 | —                   | owner; venue staff (their venue); admin                                    | rpc                                                                         |
| qr_tokens, penalties                                     | —                   | owner; admin                                                               | rpc                                                                         |
| reviews                                                  | `published`         | published, own (any status), admin                                         | update own `rating`/`text` within 24 h; admin update/delete; insert via rpc |
| review_reports                                           | —                   | reporter; admin                                                            | reporter insert; admin update                                               |
| notifications                                            | —                   | owner                                                                      | owner update/delete (mark read)                                             |
| notification_preferences                                 | —                   | owner                                                                      | owner insert/update                                                         |
| account_deletion_requests                                | —                   | owner; admin                                                               | owner insert                                                                |
| feature_flags                                            | —                   | all rows                                                                   | admin                                                                       |
| audit_log                                                | —                   | admin                                                                      | — (triggers)                                                                |

## 5. RPC (M2)

| Function                                                                                                  | Notes                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rpc_nearby_venues(p_lat, p_lng, p_radius_m = 5000, p_category = null, p_open_now = false, p_limit = 50)` | security invoker; active venues within the radius via `earth_box` + `earth_distance`; returns venue columns, `category_slug`, `distance_m`; nearest first; limit ≤ 200 |
| `rpc_venue_is_open(p_venue_id, p_at = now())`                                                             | security invoker; venue-local weekday/time against `venue_hours`, overnight slots supported                                                                            |
| `custom_access_token_hook(event)`                                                                         | Supabase Auth hook (`supabase_auth_admin` only): adds `claims.app_metadata.roles`                                                                                      |

Booking, check-in, subscription and review mutations (`rpc_book`, `rpc_checkin`, …) are M5–M7.
