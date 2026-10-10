# Demo seed data

`supabase/seed.sql` fills an empty database with a believable slice of Tashkent: 30 partner
venues, 3 plans, 100 demo members with two months of history, partner staff and an admin. It is
**generated** by `supabase/seed/generate.mjs` and committed; never edit the SQL by hand.

## Regenerate

```bash
node supabase/seed/generate.mjs           # rewrites supabase/seed.sql and prints a summary
node supabase/seed/generate.mjs --check   # exit 1 if seed.sql is not the generator's output
npm run db:test                           # applies migrations + seed, runs supabase/tests/seed/*
```

The output is deterministic: a fixed PRNG seed (`PRNG_SEED = 20261012` in `generate.mjs`),
stable ids derived from readable keys (`lib/ids.mjs`) and no clock reads, so the same generator
produces the same bytes on every machine. `supabase/tests/seed/platform.test.ts` runs `--check`,
so a generator change without a regenerated `seed.sql` fails the DB suite.

Before writing, `validate.mjs` checks the model (counts, Tashkent bounding box, hours, photos,
translations, plan quotas, caps, tiers, capacities, review/visit links) and stops with a readable
message, so a bad edit fails in the generator rather than in Postgres.

| Path                                                  | What                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `seed/data/*.mjs`                                     | Hand-written content: categories, 30 venues, classes, plans, flags, texts |
| `seed/build/catalog.mjs`                              | Venues, hours (women-only windows split out), photos, trainers, timetable |
| `seed/build/members.mjs`                              | Members, staff, admin, scenarios, devices, consents                       |
| `seed/build/subscriptions.mjs`                        | Billing periods, freezes, payments, saved cards                           |
| `seed/build/habits.mjs`, `visits.mjs`, `activity.mjs` | Visit simulation and the scripted demo stories                            |
| `seed/build/extras.mjs`, `notifications.mjs`          | Reviews, favorites, notifications, payouts, deletion request              |
| `seed/render/*.mjs`, `lib/sql.mjs`                    | SQL rendering                                                             |

## How it is applied

- **Embedded PostgreSQL** (`npm run db:test`, `npm run db:up`): `scripts/db/migrate.mjs --seed`
  runs it once after the migrations, in one transaction.
- **Supabase local / CI**: `supabase start` / `supabase db reset` apply it through
  `[db.seed] sql_paths` in `supabase/config.toml`; the harness then sees it as applied.
- **By hand**: `npm run db:sql -- -f supabase/seed.sql`.

Re-running is a no-op (tested): every row has a stable id and is inserted with
`on conflict do nothing`; rows that move to a later state are inserted in their initial state
and moved by an update guarded by that state (`... where status = 'pending'`), which also makes
the ledger triggers record a real transition. The seed expects an empty database or one it
seeded itself. It runs as the database owner (postgres), like both targets do.

`auth.users` differs between targets. The seed always writes the columns both have (`id`,
`phone`, `phone_confirmed_at`, `raw_app_meta_data`, `raw_user_meta_data`, `created_at`,
`updated_at`) and, inside a `do` block, adds `instance_id`, `aud`, `role`, `is_anonymous` and
the GoTrue token columns (as `''`) only when they exist. An `auth.identities` row (provider
`phone`) is added only where that table exists (Supabase). Profiles come from the
`on_auth_user_created` trigger and are then completed (locale, theme, gender, birth date,
terms/privacy/marketing timestamps) as onboarding would.

## The fixed anchor date

Everything is relative to **Monday 2026-10-12 00:00 Asia/Tashkent** (`ANCHOR_DATE` in
`seed/lib/time.mjs`):

- history (bookings, visits, payments, reviews, notifications) covers the 60 days before it;
- the class timetable covers the same 60 days (sessions `completed`) and the 14 days after it
  (`scheduled`), so past class bookings point at real sessions;
- upcoming bookings fall in the first week after it; the reformer waitlist demo is on Tuesday
  2026-10-13 at 19:00 and the partner "today" demo on the anchor day itself.

Nothing rolls the timetable forward yet. From M5 a `pg_cron` job generates sessions from
`class_templates` and expires bookings; until then, when the anchor drifts into the past, move
`ANCHOR_DATE` by whole weeks (it must stay a Monday: the scripted stories pick times per weekday,
and the generator refuses another weekday) and regenerate.

## Demo accounts

Phones are stored in E.164; `auth.users.phone` holds the same digits without `+`.

| Phone               | Name                 | Locale | Role(s)         | Story                                                                                                             |
| ------------------- | -------------------- | ------ | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `+998 90 000 00 00` | Администратор (демо) | ru     | member, admin   | Admin web app; reads every table through RLS (`is_admin()`)                                                       |
| `+998 90 123 45 00` | Бахтиёр Юсупов       | ru     | member, partner | Owner of Pulse Fitness Yunusabad and Pulse Fitness Chilanzar (a two-venue chain)                                  |
| `+998 90 123 46 00` | Shahzod Aliyev       | uz     | member, partner | Staff at Pulse Fitness Yunusabad: today's roster has at least 6 bookings                                          |
| `+998 90 123 47 00` | Ольга Ким            | ru     | member, partner | Owner of Lotus Yoga Studio                                                                                        |
| `+998 90 123 48 00` | Nodira Saidova       | uz     | member, partner | Staff at Zilol Aqua Centre (women-only hours on Tue/Thu mornings)                                                 |
| `+998 90 123 49 00` | Rustam Karimov       | en     | member, partner | Owner of Oasis Spa and of Tiniq Massage, a `draft` venue only staff and admins can see                            |
| `+998 90 100 00 01` | Дильноза Каримова    | ru     | member          | Standard, active; booking today 18:30 at Pulse Yunusabad and a Wednesday hatha class; 3 favorites; reviewed Lotus |
| `+998 90 100 00 02` | Jasur Toshmatov      | uz     | member          | Basic, 7 of 8 visits used, 4 of 4 at Kuch Gym (venue cap reached): the "1 visit left" state                       |
| `+998 90 100 00 03` | Kamila Yusupova      | en     | member          | Premium; first on the waitlist of the full reformer class (Tue 19:00); spa booking Thursday; reviewed Oasis       |
| `+998 90 100 00 04` | Анна Ким             | ru     | member          | Standard, frozen for 14 days (6 days ago to 8 days ahead)                                                         |
| `+998 90 100 00 05` | Sardor Rahimov       | uz     | member          | Signed up 2 days ago, no subscription, 2 favorites: the plans/checkout entry point                                |
| `+998 90 100 00 06` | Тимур Назаров        | ru     | member          | Basic; 3 no-shows in 30 days, so a 7-day booking block is active over the anchor                                  |
| `+998 90 100 00 07` | Malika Ismoilova     | uz     | member          | Returning member: Standard expired, Premium `pending_payment` with a pending payment                              |
| `+998 90 100 00 08` | Daniel Kim           | en     | member          | Premium, active, downgrade to Standard scheduled at renewal (`scheduled_plan_id`)                                 |

The other 92 members have generated Uzbek, Russian and Korean-diaspora names, spelled for their
locale (uz Latin, ru Cyrillic, en transliteration), phones `+99890XXXXXXX` that never end in
`00` and never use `+998 90 100 0…` or the test suites' `+998 90 123 45 67`.
`supabase/tests/seed/helpers.ts` lists the fixed phones the tests rely on.

Signing in: the embedded database has no GoTrue, so it is data only. On Supabase local,
`[auth.sms.test_otp]` in `config.toml` gives `998900000000` and `998901234500` the fixed code
`123456`; any other demo phone receives its code through the `auth-sms-hook` Edge Function, whose
`MockSmsProvider` prints it to the function log. All numbers are fictitious, which is one more
reason `SMS_PROVIDER` must stay `mock` outside production.

## What is in it

| Area       | Content                                                                                                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans      | Basic 199 000 UZS / 8 visits / tier 1 / 4 per venue; Standard 349 000 / 16 / tier 2 / 8; Premium 599 000 / 99 (fair-use "unlimited") / tier 3 / 99                                                                                |
| Categories | 12: gym, pool, yoga, pilates, dance, martial-arts, crossfit, spa, sauna-hammam, massage, physio, recovery (`icon` = lucide name)                                                                                                  |
| Venues     | 30 in 8 districts (28 active, 1 paused for renovation, 1 draft); tiers 1-3 and price tiers; 2-5 photos, hours for all 7 days, 1-3 trainers, 1-4 class templates each; 19 active venues within 5 km of Amir Temur square           |
| Timetable  | About 2 000 class sessions (74 days); one Core Pilates reformer session full with 2 on the waitlist                                                                                                                               |
| Members    | 100: 20 active per plan, 3 frozen, 3 past due, 4 pending payment, 8 lapsed (expired), 22 without a subscription; 3 actives cancel at period end                                                                                   |
| Activity   | About 950 bookings: ~810 checked in, ~40 no-shows, ~50 free cancellations, ~45 upcoming, 2 waitlisted; ~900 visits (QR with a used token, ~10 manual with a reason, ~90 walk-ins)                                                 |
| Money      | One paid payment per billing period (Payme/Click/Uzum), some failed attempts, failed renewals for past-due members, saved cards for about two thirds of the payers, payouts per venue for Aug (paid), Sep (approved), Oct (draft) |
| Reviews    | 15 published, written in the reviewer's language, on their own visits; `rating_avg`/`rating_count` come from the trigger                                                                                                          |
| Other      | Favorites, in-app notifications (ru/uz/en), notification preferences, consents, devices (no push tokens), 1 penalty, 1 open deletion request, 9 feature flags                                                                     |

## How the data maps to app flows

| Flow                | Seeded data that drives it                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Home                | `subscriptions.visits_used` vs plan (remaining visits), next `bookings` row, `rpc_nearby_venues`, categories                   |
| Discover (list/map) | `rpc_nearby_venues(lat, lng, radius, category slug, open_now)`, `venues.district`, amenities, `women_only_hours`, ratings      |
| Venue page          | `venue_photos` (blurhash placeholders), `venue_hours`, `trainers`, `class_sessions`, published `reviews`, `favorites`          |
| Booking             | Tier rule, monthly quota and per-venue cap (Jasur), penalty block (Тимур), full class + waitlist (Kamila), cancellation window |
| QR / check-in       | `qr_tokens` (45 s, single use), `visits.qr_jti`, `checkin_attempts` (`OK`, a few `TOKEN_EXPIRED` retries)                      |
| Subscription        | All statuses, `subscription_freezes`, `scheduled_plan_id`, `cancel_at`, `payments` + ledger, saved `payment_methods`           |
| Profile             | Locale/theme, favorites, visit history, notifications, preferences, consents, account deletion request                         |
| Partner mode        | `venue_staff` (owner vs staff, draft venue), today's roster at Pulse Yunusabad, visits/no-shows for stats, `payouts`           |
| Admin               | Roles from `user_roles` via the access-token hook, `audit_log` of the seeding, reviews, payouts, deletion queue                |

## Conventions other code relies on

- `venues.district` is a key: `yunusabad`, `chilanzar`, `mirzo-ulugbek`, `yakkasaray`,
  `mirabad`, `shaykhantahur`, `sergeli`, `almazar`; the localized address is in `venues.address`.
- Category slugs use hyphens (`martial-arts`, `sauna-hammam`): the `venue_categories.slug` check
  allows `^[a-z0-9]+(-[a-z0-9]+)*$` only. `icon` is a lucide-react-native icon name.
- Amenity keys: `showers`, `lockers`, `parking`, `wifi`, `towels`, `air_conditioning`,
  `personal_training`, `sauna`, `pool`, `cafe`, `hairdryer`, `kids_room`, `mats_provided`,
  `tea_lounge`, `equipment_rental`, `water`, `wheelchair_access` (translate in the app).
- `trainers.specialties` holds class template keys (`hatha`, `reformer`, `kurash`, ...).
- `venue_photos.path` is either a Storage object key or, for seeded placeholders, an absolute
  `https://picsum.photos/seed/<slug>-<n>/1200/800` URL; image code must accept both.
- `venues.women_only_hours` summarises the `venue_hours` rows with `women_only = true` as
  `[{ "weekday": 2, "opens": "10:00", "closes": "13:00" }]` (null when there are none). Opening
  hours are split into non-overlapping rows around those windows.
- `class_sessions.booked_count` counts seats taken (`confirmed`, `checked_in`, `no_show`);
  `waitlist_count` counts `waitlisted` bookings.
- One `subscriptions` row per 30-day billing period; a renewal is a new row and the previous one
  is `expired`. `visits_used` = visits + no-shows of that period. Free cancellations do not count.
- `plans.perks` is `[{ "key", "ru", "uz", "en" }]`.
- `feature_flags.key` is snake_case (the table allows `^[a-z0-9_]+$`); `payload.app_key` names
  the flag in `src/shared/config/featureFlags.ts` and `payload.value` is its value
  (`payments_payme` -> `payments.payme: false`, `maps_provider` -> `maps.provider: "yandex"`).
  `no_show_penalty` carries the penalty rule numbers (3 no-shows in 30 days, 7-day block).
- Seeded bookings and payments have `idempotency_key` `seed:booking:<n>` / `seed:payment:<n>`;
  payment ledger rows have source `system`. Consents use version `2026-04-01`.
- Provider transaction ids, card tokens and venue phone numbers are fake. Payout rates per visit
  (15 000 / 25 000 / 45 000 UZS by tier) are illustrative, not commercial terms.
