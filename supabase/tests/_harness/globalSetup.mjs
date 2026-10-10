/**
 * Jest globalSetup for the db project: starts the embedded PostgreSQL unless DATABASE_URL already
 * points at a database (CI uses the Supabase local stack, `npm run db:up` another terminal), then
 * applies shim + migrations + seed. Workers inherit DATABASE_URL from this process.
 */
import process from 'node:process';

import { maskUrl } from '../../../scripts/db/config.mjs';
import { startEmbeddedDb } from '../../../scripts/db/embedded.mjs';
import { migrate } from '../../../scripts/db/migrate.mjs';

export default async function globalSetup() {
  const verbose = process.env.DB_VERBOSE === '1';
  const log = (line) => process.stderr.write(`${line}\n`);

  if (process.env.DATABASE_URL) {
    log(`db tests: using DATABASE_URL=${maskUrl(process.env.DATABASE_URL)}`);
  } else {
    const db = await startEmbeddedDb();
    process.env.DATABASE_URL = db.url;
    globalThis.__ONEHEAL_EMBEDDED_DB__ = db;
    log(`db tests: embedded PostgreSQL ready on port ${db.port} in ${db.startedInMs} ms`);
  }

  await migrate({
    databaseUrl: process.env.DATABASE_URL,
    seed: true,
    log: verbose ? log : () => {},
  });
}
