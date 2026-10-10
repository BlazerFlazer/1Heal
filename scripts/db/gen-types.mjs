#!/usr/bin/env node
/**
 * Regenerates src/services/api/database.types.ts from the migrations:
 * starts the embedded PostgreSQL, applies shim + migrations (no seed), runs
 * `supabase gen types typescript --db-url <url> --schema public`, formats the output with the
 * repo's Prettier config (so `prettier --check` and CI's drift check see a stable file) and writes
 * it only when the CLI succeeds, so a failed run never leaves an empty file behind.
 *
 *   node scripts/db/gen-types.mjs [output-path]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import * as prettier from 'prettier';

import { startEmbeddedDb } from './embedded.mjs';
import { migrate } from './migrate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = path.join(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');
const DEFAULT_OUTPUT = path.join(ROOT, 'src', 'services', 'api', 'database.types.ts');
// Optional first argument: another output path (used to inspect the generator without touching src/).
const OUTPUT = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT;

// The CLI validates supabase/config.toml even for --db-url; the send_sms hook secret it reads from
// the environment is irrelevant for type generation, so a well-formed placeholder stands in.
const PLACEHOLDER_HOOK_SECRET = 'v1,whsec_Y2ktZHVtbXktc2VuZC1zbXMtaG9vay1zZWNyZXQ=';

function generateTypes(databaseUrl) {
  // The embedded cluster speaks plain TCP on loopback; the CLI defaults to TLS.
  const url = `${databaseUrl}?sslmode=disable`;
  const args = [CLI, 'gen', 'types', 'typescript', '--db-url', url, '--schema', 'public'];
  const env = { ...process.env };
  env.SEND_SMS_HOOK_SECRETS ||= PLACEHOLDER_HOOK_SECRET;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && stdout.trim()) resolve(stdout);
      else {
        const output = `${stderr}\n${stdout}`.trim();
        reject(new Error(`supabase gen types exited with code ${code}\n${output}`));
      }
    });
  });
}

async function main() {
  const db = await startEmbeddedDb();
  try {
    await migrate({ databaseUrl: db.url, seed: false });
    const raw = await generateTypes(db.url);
    const options = (await prettier.resolveConfig(OUTPUT)) ?? {};
    const types = await prettier.format(raw, { ...options, filepath: OUTPUT });
    await mkdir(path.dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, types);
    process.stdout.write(`wrote ${path.relative(ROOT, OUTPUT)} (${types.length} bytes)\n`);
  } finally {
    await db.stop();
  }
}

// Explicit exit codes: embedded-postgres' exit hook would otherwise override process.exitCode.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
