/**
 * Shared settings of the local database harness (no heavy imports: migrate.mjs and the Jest
 * global hooks load this without pulling in embedded-postgres).
 */
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

export const DEFAULT_PORT = 54329;
export const DB_USER = 'postgres';
export const DB_PASSWORD = 'postgres';

/** Port of the embedded cluster: DB_PORT or 54329. */
export function resolvePort(env = process.env) {
  const raw = env.DB_PORT;
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`DB_PORT must be a port number between 1024 and 65535, got "${raw}"`);
  }
  return port;
}

/**
 * Data directory of the embedded cluster. Lives outside the repo because initdb/postgres on Windows
 * reject non-ASCII paths and the repo path contains Cyrillic; DB_DATA_DIR overrides it.
 */
export function dataDirFor(port, env = process.env) {
  return env.DB_DATA_DIR || path.join(os.tmpdir(), `oneheal-pg-${port}`);
}

export function databaseUrlFor(port) {
  return `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${port}/postgres`;
}

/** DATABASE_URL when set (CI, `npm run db:up` in another terminal), else the embedded default. */
export function resolveDatabaseUrl(env = process.env) {
  return env.DATABASE_URL || databaseUrlFor(resolvePort(env));
}

/** Hides the password when a URL is printed. */
export function maskUrl(url) {
  return url.replace(/:\/\/([^:/@]+):[^@]*@/, '://$1:***@');
}
