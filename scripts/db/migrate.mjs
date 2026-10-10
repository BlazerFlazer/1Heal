#!/usr/bin/env node
/**
 * Applies supabase/tests/_shim/*.sql (only when the target is not Supabase), then
 * supabase/migrations/*.sql in filename order, then optionally supabase/seed.sql.
 *
 *   node scripts/db/migrate.mjs [--seed] [--url <database-url>]
 *
 * Target: --url, else DATABASE_URL, else the embedded default (scripts/db/config.mjs).
 * Each file runs in its own transaction and is recorded in harness.schema_migrations with a
 * checksum, so re-running is a no-op. Files already applied by the Supabase CLI
 * (supabase_migrations.schema_migrations / seed_files) are skipped, which makes the same command
 * safe after "supabase start" in CI. A file edited after it was applied fails loudly: the embedded
 * database is throwaway, so restart it ("npm run db:reset" if it crashed).
 *
 * Shim detection: DB_SHIM=1 forces it, DB_SHIM=0 forbids it, otherwise it is applied when schema
 * "auth" is missing. It is never applied where auth.uid() already exists.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

import { maskUrl, resolveDatabaseUrl } from './config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHIM_DIR = path.join(ROOT, 'supabase', 'tests', '_shim');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const SEED_FILE = path.join(ROOT, 'supabase', 'seed.sql');
// Private schema: keeps the ledger out of `public` (generated types, "every public table has RLS").
const LEDGER = 'harness.schema_migrations';

export class MigrationError extends Error {
  constructor(label, cause, sql) {
    super(describeSqlError(label, cause, sql));
    this.name = 'MigrationError';
    this.cause = cause;
  }
}

/** "<file> failed (<code>) at line L, column C: <message>" plus detail/hint/context. */
function describeSqlError(label, error, sql) {
  const e = error && typeof error === 'object' ? error : {};
  let where = '';
  const lines = [];
  const position = Number(e.position);
  if (position > 0) {
    const before = sql.slice(0, position - 1);
    const line = before.split('\n').length;
    const column = position - before.lastIndexOf('\n') - 1;
    where = ` at line ${line}, column ${column}`;
    lines.push(`  > ${sql.split('\n')[line - 1]?.trim() ?? ''}`);
  }
  if (e.detail) lines.push(`  detail: ${e.detail}`);
  if (e.hint) lines.push(`  hint: ${e.hint}`);
  if (e.where) lines.push(`  context: ${e.where}`);
  const code = e.code ? ` (${e.code})` : '';
  return [`${label} failed${code}${where}: ${e.message ?? String(error)}`, ...lines].join('\n');
}

async function listSqlFiles(dir) {
  try {
    return (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readSql(file) {
  const sql = await readFile(file, 'utf8');
  return { sql, checksum: createHash('sha256').update(sql).digest('hex') };
}

async function exists(client, regprocOrClass) {
  const { rows } = await client.query(regprocOrClass);
  return Boolean(rows[0]?.ok);
}

async function supabaseCliVersions(client) {
  const sql = `select to_regclass('supabase_migrations.schema_migrations') is not null as ok`;
  if (!(await exists(client, sql))) return null;
  const { rows } = await client.query('select version from supabase_migrations.schema_migrations');
  return new Set(rows.map((row) => String(row.version)));
}

async function supabaseCliSeeded(client) {
  const sql = `select to_regclass('supabase_migrations.seed_files') is not null as ok`;
  if (!(await exists(client, sql))) return false;
  const { rowCount } = await client.query(
    `select 1 from supabase_migrations.seed_files where path like '%seed.sql' limit 1`,
  );
  return (rowCount ?? 0) > 0;
}

async function applyInTransaction(client, key, label, { sql, checksum }) {
  await client.query('begin');
  try {
    await client.query(sql);
    await client.query(`insert into ${LEDGER} (name, checksum) values ($1, $2)`, [key, checksum]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw new MigrationError(label, error, sql);
  }
}

function changedError(label) {
  return new Error(
    `${label} changed after it was applied. The embedded database is throwaway: restart ` +
      '"npm run db:up" / re-run the tests (or "npm run db:reset" after a crash).',
  );
}

/**
 * @param {{ databaseUrl?: string, seed?: boolean, log?: (line: string) => void }} [options]
 * @returns {Promise<{ shim: [string, string][], migrations: [string, string][], seed: string }>}
 */
export async function migrate(options = {}) {
  const databaseUrl = options.databaseUrl ?? resolveDatabaseUrl();
  const log = options.log ?? ((line) => process.stderr.write(`${line}\n`));
  const startedAt = Date.now();
  const summary = { shim: [], migrations: [], seed: 'not requested' };

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('create schema if not exists harness');
    await client.query(
      `create table if not exists ${LEDGER} (
         name text primary key, checksum text not null, applied_at timestamptz not null default now())`,
    );
    const ledger = new Map(
      (await client.query(`select name, checksum from ${LEDGER}`)).rows.map((r) => [
        r.name,
        r.checksum,
      ]),
    );
    const record = (bucket, label, status) => {
      bucket.push([label, status]);
      log(`  ${label.padEnd(56)} ${status}`);
    };
    log(`migrate -> ${maskUrl(databaseUrl)}`);

    // 1. Shim (embedded PostgreSQL only).
    const authExists = await exists(client, `select to_regnamespace('auth') is not null as ok`);
    const shimWanted = process.env.DB_SHIM === '1' || (process.env.DB_SHIM !== '0' && !authExists);
    for (const name of await listSqlFiles(SHIM_DIR)) {
      const key = `_shim/${name}`;
      const file = await readSql(path.join(SHIM_DIR, name));
      if (ledger.has(key)) {
        if (ledger.get(key) !== file.checksum) throw changedError(key);
        record(summary.shim, key, 'already applied');
      } else if (!shimWanted) {
        record(summary.shim, key, 'skipped (target provides schema auth)');
      } else {
        const uidExists = await exists(client, `select to_regproc('auth.uid') is not null as ok`);
        if (uidExists) {
          throw new Error(
            `refusing to apply ${key}: auth.uid() already exists (a Supabase database?). Unset DB_SHIM.`,
          );
        }
        await applyInTransaction(client, key, key, file);
        record(summary.shim, key, 'applied');
      }
    }

    // 2. Migrations in filename order, one transaction each.
    const cliVersions = await supabaseCliVersions(client);
    const migrations = await listSqlFiles(MIGRATIONS_DIR);
    if (migrations.length === 0) log('  (no files in supabase/migrations)');
    for (const name of migrations) {
      const label = `migrations/${name}`;
      const file = await readSql(path.join(MIGRATIONS_DIR, name));
      if (ledger.has(name)) {
        if (ledger.get(name) !== file.checksum) throw changedError(label);
        record(summary.migrations, label, 'already applied');
      } else if (cliVersions?.has(name.split('_')[0] ?? '')) {
        record(summary.migrations, label, 'applied by the Supabase CLI');
      } else {
        await applyInTransaction(client, name, label, file);
        record(summary.migrations, label, 'applied');
      }
    }

    // 3. Seed (idempotent by contract: the Supabase CLI applies it too).
    if (options.seed) {
      const seed = await readSql(SEED_FILE).catch((error) => {
        if (error && error.code === 'ENOENT') return null;
        throw error;
      });
      if (!seed) summary.seed = 'skipped (no supabase/seed.sql)';
      else if (ledger.has('seed.sql')) {
        if (ledger.get('seed.sql') !== seed.checksum) throw changedError('seed.sql');
        summary.seed = 'already applied';
      } else if (await supabaseCliSeeded(client)) summary.seed = 'applied by the Supabase CLI';
      else {
        await applyInTransaction(client, 'seed.sql', 'seed.sql', seed);
        summary.seed = 'applied';
      }
      log(`  ${'seed.sql'.padEnd(56)} ${summary.seed}`);
    }
  } finally {
    await client.end();
  }

  const count = (rows, status) => rows.filter(([, s]) => s === status).length;
  log(
    `done in ${Date.now() - startedAt} ms: shim ${count(summary.shim, 'applied')} applied, ` +
      `migrations ${count(summary.migrations, 'applied')} applied / ` +
      `${summary.migrations.length - count(summary.migrations, 'applied')} skipped, seed ${summary.seed}`,
  );
  return summary;
}

function parseArgs(argv) {
  const options = { seed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seed') options.seed = true;
    else if (arg === '--url') options.databaseUrl = argv[++i];
    else throw new Error(`unknown argument "${arg}" (usage: migrate.mjs [--seed] [--url <url>])`);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    if (process.env.DB_VERBOSE === '1' && error instanceof Error) console.error(error.stack);
    process.exitCode = 1;
  });
}
