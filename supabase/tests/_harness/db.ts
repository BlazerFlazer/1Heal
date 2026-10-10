/**
 * Jest helpers for database tests (RLS, triggers, SQL functions) over node-postgres.
 *
 * Isolation: wrap each test in `runInTransaction`. It BEGINs, hands you a client and always
 * ROLLBACKs, so parallel workers share one database. The `as*` helpers use `set local role` and
 * transaction-scoped `set_config`, which vanish with the rollback. A statement that throws aborts
 * the transaction; run it inside `withSavepoint` (or `expectDenied(fn, client)`) to keep going.
 *
 * Works against the embedded PostgreSQL (shim) and a real Supabase local stack.
 */
import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';

export type DbClient = PoolClient;

export interface TestUserInput {
  id?: string;
  /** As stored by Supabase Auth: E.164 digits without "+" (e.g. 998901234567). */
  phone?: string;
  email?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}

export interface TestUser {
  id: string;
  /** Value of auth.users.phone (no "+"). */
  phone: string;
  /** The same number as the app stores it: +998XXXXXXXXX. */
  phoneE164: string;
}

export interface UserClaimsInput {
  sub: string;
  /** Becomes the `app_metadata.roles` claim written by the custom access-token hook. */
  roles?: readonly string[];
  phone?: string;
  /** Extra or overriding top-level JWT claims. */
  claims?: Record<string, unknown>;
}

const INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

let pool: Pool | undefined;

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run "npm run db:test" (its globalSetup starts the embedded ' +
        'database) or export DATABASE_URL.',
    );
  }
  return url;
}

/** One pool per Jest worker; closed by the harness `afterAll` (setup.ts). */
export function getPool(): Pool {
  pool ??= new Pool({ connectionString: databaseUrl(), max: 5 });
  return pool;
}

export async function closePool(): Promise<void> {
  const current = pool;
  pool = undefined;
  await current?.end();
}

export async function withClient<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** BEGIN, run `fn`, always ROLLBACK. The default isolation for a test. */
export async function runInTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  return withClient(async (client) => {
    await client.query('begin');
    try {
      return await fn(client);
    } finally {
      await client.query('rollback');
    }
  });
}

/** Runs `fn` inside a savepoint so a failing statement does not abort the outer transaction. */
export async function withSavepoint<T>(client: DbClient, fn: () => Promise<T>): Promise<T> {
  const name = `sp_${randomUUID().replaceAll('-', '')}`;
  await client.query(`savepoint ${name}`);
  try {
    const result = await fn();
    await client.query(`release savepoint ${name}`);
    return result;
  } catch (error) {
    await client.query(`rollback to savepoint ${name}`);
    throw error;
  }
}

async function assumeRole(
  client: DbClient,
  role: 'anon' | 'authenticated' | 'service_role',
  claims: Record<string, unknown>,
): Promise<void> {
  await client.query(`set local role ${role}`);
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
}

/** Unauthenticated request: role anon, no `sub`. */
export function asAnon(client: DbClient): Promise<void> {
  return assumeRole(client, 'anon', { role: 'anon', aud: 'authenticated' });
}

/** Signed-in request: role authenticated with the claims Supabase Auth would issue. */
export function asUser(client: DbClient, user: UserClaimsInput): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  return assumeRole(client, 'authenticated', {
    iss: 'supabase-test-harness',
    sub: user.sub,
    aud: 'authenticated',
    role: 'authenticated',
    phone: user.phone ?? '',
    app_metadata: { provider: 'phone', providers: ['phone'], roles: user.roles ?? ['member'] },
    user_metadata: {},
    is_anonymous: false,
    session_id: randomUUID(),
    iat: now,
    exp: now + 3600,
    ...user.claims,
  });
}

/** Server-side request with the service key: role service_role (bypasses RLS). */
export function asService(client: DbClient): Promise<void> {
  return assumeRole(client, 'service_role', { role: 'service_role' });
}

/** Back to the connection's own role (postgres) with no JWT claims. */
export async function resetRole(client: DbClient): Promise<void> {
  await client.query('reset role');
  await client.query(`select set_config('request.jwt.claims', '', true)`);
}

/**
 * Empties every table of a schema (default public; the migration ledger lives in schema harness
 * and is untouched) for tests that cannot run inside one transaction, e.g. concurrency tests over
 * several connections.
 */
export async function truncateAll(
  client: DbClient,
  options: { schema?: string; except?: readonly string[]; authUsers?: boolean } = {},
): Promise<void> {
  const schema = options.schema ?? 'public';
  const except = new Set(options.except ?? []);
  const { rows } = await client.query<{ tablename: string }>(
    'select tablename from pg_tables where schemaname = $1 order by tablename',
    [schema],
  );
  const tables = rows
    .map((row) => row.tablename)
    .filter((name) => !except.has(name))
    .map((name) => `${client.escapeIdentifier(schema)}.${client.escapeIdentifier(name)}`);
  if (tables.length > 0) {
    await client.query(`truncate table ${tables.join(', ')} restart identity cascade`);
  }
  if (options.authUsers) await client.query('delete from auth.users');
}

/** A random Uzbek mobile number in E.164 (+998 9X XXX XX XX). */
export function uniquePhone(): string {
  const digits = String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
  return `+99890${digits}`;
}

/** Inserts a confirmed phone user into auth.users (shim and real Supabase alike). */
export async function createAuthUser(
  client: DbClient,
  input: TestUserInput = {},
): Promise<TestUser> {
  const id = input.id ?? randomUUID();
  const phone = (input.phone ?? uniquePhone()).replace(/^\+/, '');
  const appMetadata = { provider: 'phone', providers: ['phone'], ...input.appMetadata };
  await client.query(
    `insert into auth.users (instance_id, id, aud, role, email, phone, phone_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ($1, $2, 'authenticated', 'authenticated', $3, $4, now(), $5, $6, now(), now())`,
    [
      INSTANCE_ID,
      id,
      input.email ?? null,
      phone,
      JSON.stringify(appMetadata),
      JSON.stringify(input.userMetadata ?? {}),
    ],
  );
  return { id, phone, phoneE164: `+${phone}` };
}

type Action = Promise<unknown> | (() => Promise<unknown>);

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function isEmptyResult(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyResult);
  if (value && typeof value === 'object' && 'rows' in value && Array.isArray(value.rows)) {
    const rowCount = 'rowCount' in value && typeof value.rowCount === 'number' ? value.rowCount : 0;
    return value.rows.length === 0 && rowCount === 0;
  }
  return false;
}

function describeOutcome(value: unknown): string {
  if (value && typeof value === 'object' && 'rows' in value && Array.isArray(value.rows)) {
    const rowCount = 'rowCount' in value ? String(value.rowCount) : '?';
    return `${value.rows.length} row(s) returned, rowCount ${rowCount}`;
  }
  return JSON.stringify(value) ?? String(value);
}

async function settle(action: Action, client?: DbClient): Promise<unknown> {
  if (typeof action === 'function') {
    return client ? withSavepoint(client, action) : action();
  }
  if (client) {
    throw new Error('expectDenied/expectErrorCode: pass a function with the client, not a promise');
  }
  return action;
}

/** Asserts the statement failed with SQLSTATE `code` (e.g. 'P0001' for raise exception). */
export async function expectErrorCode(
  action: Action,
  code: string,
  client?: DbClient,
): Promise<void> {
  let outcome: unknown;
  try {
    outcome = await settle(action, client);
  } catch (error) {
    const actual = errorCode(error);
    if (actual === code) return;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `expected SQLSTATE ${code} but got ${actual ?? 'a non-database error'}: ${message}`,
    );
  }
  throw new Error(
    `expected SQLSTATE ${code} but the statement succeeded: ${describeOutcome(outcome)}`,
  );
}

/**
 * Asserts the statement was denied: SQLSTATE 42501 (missing grant or "new row violates
 * row-level security policy") or, for reads/updates/deletes filtered by RLS, no rows.
 * Pass `(fn, client)` to run it inside a savepoint so the transaction stays usable.
 */
export async function expectDenied(action: Action, client?: DbClient): Promise<void> {
  let outcome: unknown;
  try {
    outcome = await settle(action, client);
  } catch (error) {
    const code = errorCode(error);
    if (code === '42501') return;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `expected a permission/RLS denial (42501) but got ${code ?? 'a non-database error'}: ${message}`,
    );
  }
  if (isEmptyResult(outcome)) return;
  throw new Error(
    `expected a permission/RLS denial (42501) or an empty result, but the statement succeeded: ` +
      describeOutcome(outcome),
  );
}
