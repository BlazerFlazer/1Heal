# Runbook

Operational how-tos. Each section is owned by the milestone that introduced it; keep commands
copy-pasteable and say what the reader should observe.

## Database

Two targets run the same migrations, RLS tests and seed:

| Target                     | Where                      | How                                                                                                |
| -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| Embedded PostgreSQL 17     | any machine, no Docker     | `npm run db:test` starts it, runs `supabase/tests/_shim`, migrations, seed, tests, then deletes it |
| Supabase local (real auth) | CI job `db`, Docker needed | `supabase start` applies migrations + seed; `DATABASE_URL=... npm run db:test` reuses that DB      |

The embedded cluster is throwaway: every start runs `initdb` into `%TEMP%/oneheal-pg-<port>`
(ASCII path, outside the repo because initdb on Windows rejects non-ASCII paths), every stop
deletes it. Port `54329` by default (`DB_PORT` to change, `DB_DATA_DIR` to relocate,
`DB_VERBOSE=1` for the postgres log and the migration list).

### Run the tests

```bash
npm run db:test                 # ~15 s to boot the cluster, then Jest (4 workers, one shared DB)
DB_VERBOSE=1 npm run db:test    # also prints initdb/postgres output and every migration
```

Faster loop while writing SQL: keep a cluster running in one terminal and point the tests at it.

```bash
npm run db:up                   # starts, migrates + seeds, prints DATABASE_URL=..., waits for Ctrl+C
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres npm run db:test
```

With `DATABASE_URL` set the Jest global setup does not start anything; it only runs
`scripts/db/migrate.mjs --seed`, which is idempotent (see below). The same mechanism is what CI
uses against Supabase local.

### Write a test

Tests live in `supabase/tests/<domain>/*.test.ts` (and `supabase/functions/**/*.test.ts`) and run
with `jest.db.config.js` (plain Node, Babel TypeScript, no jest-expo). Helpers:
`supabase/tests/_harness/db.ts`.

```ts
import { asAnon, asUser, createAuthUser, expectDenied, runInTransaction } from '../_harness/db';

test('members see only their own bookings', async () => {
  await runInTransaction(async (client) => {
    const alice = await createAuthUser(client); // auth.users row, works on shim and Supabase
    const bob = await createAuthUser(client);
    await asUser(client, { sub: alice.id, roles: ['member'] }); // set local role + JWT claims
    await expectDenied(client.query('select * from bookings where user_id = $1', [bob.id]));
    await expectDenied(
      () => client.query('insert into bookings ... values ($1)', [bob.id]),
      client,
    );
    await asAnon(client);
    await expectDenied(client.query('select * from bookings'));
  });
});
```

Rules that keep the suite parallel-safe:

- Every test runs inside `runInTransaction` (BEGIN, test, always ROLLBACK). Never `commit`.
- A failing statement aborts the transaction. Use `expectDenied(fn, client)` /
  `expectErrorCode(fn, code, client)` (savepoint) when the test continues afterwards.
- `truncateAll(client)` exists for tests that need several connections (locking, concurrency);
  such tests must run serially (`describe` with `--runInBand` is not configured, so keep them rare).
- `createAuthUser` stores the phone as Supabase does (digits, no `+`); `phoneE164` is the app form.
- The seed must be idempotent (`on conflict do nothing`): the Supabase CLI and the harness both
  apply it, and `supabase db reset` re-applies it.

### Open a SQL prompt

There is no psql on this machine; `scripts/db/sql.mjs` is the stand-in (uses `DATABASE_URL` or
the embedded default).

```bash
npm run db:up                                   # terminal 1
npm run db:sql -- "select code, price_uzs from plans"       # rows as JSON lines + "SELECT 3 rows"
npm run db:sql -- -f supabase/seed.sql
npm run db:sql -- --as authenticated --sub <uuid> "select * from bookings"   # under RLS
npm run db:sql                                  # interactive, statements end with ";", \q quits
```

### Add a migration

1. Create `supabase/migrations/<YYYYMMDDHHMMSS>_<one_concern>.sql`. Filename order is the apply
   order on both targets; the leading timestamp is the version the Supabase CLI records.
2. No `begin`/`commit` in the file: the harness wraps each file in its own transaction, the CLI
   does the same.
3. Extensions: `create extension if not exists <name> with schema extensions;` (`cube`,
   `earthdistance`, `pg_trgm`, `citext`, `btree_gist` exist on both targets; `pg_cron`,
   `postgis`, `pgtap` only on Supabase, so guard them with `do $$ ... if exists (select 1 from
pg_available_extensions ...) $$`).
4. Every table: `enable row level security`, explicit grants to `anon`/`authenticated`/
   `service_role`, policies, `created_at`/`updated_at` with the shared trigger.
5. Run `npm run db:test`. `scripts/db/migrate.mjs` records each applied file with a checksum in
   `harness.schema_migrations` (a private schema, invisible to generated types); re-running is a
   no-op, and a file edited after it was applied fails loudly ("changed after it was applied"):
   restart `npm run db:up` or just re-run the tests, which start from an empty cluster.
6. On Supabase local (Docker): `supabase db reset` applies migrations and seed through the CLI;
   files it already applied are detected via `supabase_migrations.schema_migrations` and skipped
   by the harness.

Errors print `migrations/<file> failed (<SQLSTATE>) at line L, column C: <message>` with the
offending line, detail, hint and PL/pgSQL context.

### Regenerate database types

```bash
npm run db:types                       # embedded DB -> migrations -> supabase gen types -> src/services/api/database.types.ts
node scripts/db/gen-types.mjs out.ts   # same, to another file (inspect without touching src/)
```

The Supabase CLI from the `supabase` npm package (`gen types typescript --db-url ... --schema
public`) generates natively, no Docker needed (verified on this machine). The script appends
`sslmode=disable` (the embedded cluster is plain TCP on loopback), fills a placeholder
`SEND_SMS_HOOK_SECRETS` when the variable is unset (the CLI validates `config.toml` before it
connects), formats the output with Prettier and writes it only when the CLI succeeds. Run it after
adding migrations and commit the generated file; CI fails when it is stale.

### The shim caveat

`supabase/tests/_shim/0000_supabase_shim.sql` is applied only when the target has no schema
`auth` (the embedded cluster; `DB_SHIM=1` forces it, `DB_SHIM=0` forbids it) and refuses to run
where `auth.uid()` already exists. It emulates exactly:

- roles `anon`, `authenticated`, `service_role` (bypassrls), `authenticator`,
  `supabase_auth_admin`;
- schema `extensions` with `pgcrypto`, on the default `search_path` like Supabase;
- Supabase's default privileges in `public` for the Data API roles (RLS still denies everything
  until a policy allows it);
- schema `auth` with `auth.users` (the columns the app and migrations reference) and
  `auth.uid()`, `auth.role()`, `auth.email()`, `auth.jwt()` reading `request.jwt.claims` /
  `request.jwt.claim.*` exactly like the real functions.

It does not emulate GoTrue (no sign-in, no token issuance, no `auth.identities`/`sessions`),
PostgREST, the `storage`/`realtime` schemas, `pg_cron`, `postgis` or `pgtap`. Anything touching
those is only verified by the CI job against Supabase local; read its log, do not assume.

### CI

Job `db` in `.github/workflows/ci.yml`: `npx supabase start` (excluding studio, imgproxy, mailpit,
logflare, vector, edge-runtime, supavisor, postgres-meta) applies migrations + seed on the real
stack, then `npm run db:test` runs twice: with `DATABASE_URL` pointing at Supabase local (real
auth schema, shim skipped) and without it (embedded cluster, shim applied), then
`npm run typecheck:db`, then regenerates the database types and fails if
`src/services/api/database.types.ts` differs (ADR-030). `config.toml` reads
`SEND_SMS_HOOK_SECRETS` from the environment; CI sets a dummy value, real deployments use a
repository secret in the form `v1,whsec_<base64>` shared with the `auth-sms-hook` Edge Function.

### Troubleshooting

- `port 54329 is already in use`: a previous `npm run db:up` is still running (stop it) or set
  `DB_PORT`.
- `could not remove ... (EBUSY)`: Windows kept a handle on the data dir after shutdown. Run
  `npm run db:reset` (also removes the `oneheal-pg-share` junction initdb uses on Windows).
- `the data directory must be an ASCII-only path`: `TEMP` contains non-ASCII characters; set
  `DB_DATA_DIR=C:\pg-tmp`.
- `changed after it was applied`: see "Add a migration", step 5.

## Roll out migrations (staging, then production)

Migrations are forward-only (ADR-026): never edit a merged file, fix with a new one. The Supabase
CLI is the pinned devDependency, so always call it through `npx supabase`.

1. The PR contains the migration, the regenerated `src/services/api/database.types.ts`
   (`npm run db:types`) and tests; CI job `db` is green on both targets and its types drift check
   passes.
2. Staging:

   ```bash
   npx supabase login
   npx supabase link --project-ref <staging-ref>
   npx supabase db push --dry-run      # lists the pending files; expect only the new ones
   npx supabase db push                # applies them in filename order, one transaction each
   ```

   `db push` never runs `supabase/seed.sql`. Staging gets demo data only on purpose:
   `npx supabase db push --include-seed` on a fresh staging project.

3. First rollout of a project only (Dashboard → Authentication → Hooks): enable the custom access
   token hook (`public.custom_access_token_hook`, ADR-027) and the Send SMS hook pointing at
   `https://<ref>.supabase.co/functions/v1/auth-sms-hook`; then deploy the function:
   `npx supabase functions deploy auth-sms-hook --import-map supabase/functions/deno.json`
   (`verify_jwt = false` comes from `config.toml`). Set its secrets as in
   `supabase/functions/README.md`.
4. Smoke test on staging: sign in with a staging test number, check that the access token has
   `app_metadata.roles`, open Discover (`rpc_nearby_venues`) and flip a row in `feature_flags` to
   see the app follow it.
5. Production: take or confirm a backup (Dashboard → Database → Backups; point-in-time recovery
   when enabled), then the same `link` / `db push --dry-run` / `db push` against the production ref.
   Never `--include-seed` there.
6. If a migration fails, its transaction rolls back and later files are not applied. Fix forward
   with a new file. Restoring a backup is only for data loss, and it also rewinds every write made
   since.

Auth settings that `config.toml` does not carry to cloud projects must be set in the Dashboard
for each project: SMS OTP expiry and length, rate limits, JWT expiry, refresh-token rotation.
`SUPABASE_OTP_RESEND_AFTER_SEC` (60) and `SUPABASE_OTP_EXPIRES_IN_SEC` (600) in
`src/services/auth/SupabaseAuthService.ts` are only UI hints and must match what the project
enforces.

## Rotate the Send-SMS hook secret

Both sides accept a list, so a rotation has no failure window. Full detail:
`supabase/functions/README.md` ("Rotate the hook secret").

1. Generate: `echo "v1,whsec_$(openssl rand -base64 32)"`.
2. Function accepts old and new:
   `npx supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_NEW|v1,whsec_OLD'`.
3. Auth signs with the new one: Dashboard → Authentication → Hooks → Send SMS → secret (cloud);
   `SEND_SMS_HOOK_SECRETS` in the environment of `supabase start` (local, CI repository secret).
4. Request an OTP to a real staging number; the function log shows `sms_sent`, not
   `sms_hook_signature_rejected`.
5. Drop the old one: `npx supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_NEW'`.

Rotate immediately if a secret leaks (it lets anyone make the function send SMS at our cost, up to
the `sms_rate_limit_check` limits). Secrets never enter the repo; CI uses a dummy value.

## Refresh the demo seed

The seed is generated and committed (ADR-029). Everything is anchored to Monday 2026-10-12
(`ANCHOR_DATE` in `supabase/seed/lib/time.mjs`); details in `docs/SEED.md`.

```bash
# after editing supabase/seed/data/*.mjs or moving ANCHOR_DATE by whole weeks (must stay a Monday)
node supabase/seed/generate.mjs           # rewrites supabase/seed.sql, prints a summary
npm run db:test                           # seed tests include `generate.mjs --check`
```

Apply it to a running database:

- embedded: restart `npm run db:up` (every start is a fresh cluster);
- Supabase local: `npx supabase db reset` (migrations + seed);
- staging: only on a fresh project, `npx supabase db push --include-seed`. The seed expects an
  empty database or one it seeded itself, so do not re-run it on a database with real users.
