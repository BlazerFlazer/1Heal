#!/usr/bin/env node
/**
 * Embedded PostgreSQL 17 for migrations, RLS tests and type generation on a machine without
 * Docker or the Supabase stack.
 *
 *   node scripts/db/embedded.mjs run -- <command> [args...]   start, run the command with
 *                                                             DATABASE_URL set, stop
 *   node scripts/db/embedded.mjs up [--no-migrate]            start, migrate + seed, print
 *                                                             DATABASE_URL, wait for Ctrl+C
 *   node scripts/db/embedded.mjs reset                        delete a stale data directory
 *
 * Programmatic API (Jest globalSetup/globalTeardown):
 *   const db = await startEmbeddedDb(); ... await db.stop();
 *
 * The cluster is throwaway: every start runs initdb into os.tmpdir()/oneheal-pg-<port> and every
 * stop deletes that directory. Settings come from scripts/db/config.mjs (DB_PORT, DB_DATA_DIR).
 */
import { spawn } from 'node:child_process';
import { lstat, readlink, rm, rmdir, symlink } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import EmbeddedPostgres from 'embedded-postgres';

import { DB_PASSWORD, DB_USER, databaseUrlFor, dataDirFor, resolvePort } from './config.mjs';

const START_TIMEOUT_MS = 90_000;
const LOG_TAIL_LINES = 40;

const isAscii = (text) => /^[\x20-\x7e]+$/.test(text);

function assertAsciiPath(dir) {
  if (!isAscii(dir)) {
    throw new Error(
      `embedded-db: the data directory must be an ASCII-only path (initdb on Windows), got "${dir}". ` +
        'Set DB_DATA_DIR (or TEMP) to an ASCII path.',
    );
  }
}

/**
 * initdb embeds its share directory into SQL (COPY ... FROM '<share>/sql_features.txt') encoded in
 * the Windows ANSI code page, which the UTF8 cluster rejects when the path is not ASCII (the repo
 * path contains Cyrillic, and node_modules lives under it). A directory junction at an ASCII path
 * next to the data directory is handed to `initdb -L`; junctions need no elevated rights.
 */
async function asciiShareDir(parentDir) {
  if (process.platform !== 'win32') return undefined;
  const { initdb } = await import('@embedded-postgres/windows-x64');
  const share = path.resolve(path.dirname(initdb), '..', 'share');
  if (isAscii(share)) return share;

  const link = shareLinkFor(parentDir);
  const existing = await lstat(link).catch(() => undefined);
  if (existing?.isSymbolicLink()) {
    const target = (await readlink(link)).replace(/^\\\\\?\\/, '').replace(/[\\/]+$/, '');
    if (target.toLowerCase() === share.toLowerCase()) return link; // reuse: concurrent starts
    await rmdir(link);
  } else if (existing) {
    await rm(link, { recursive: true, force: true });
  }
  await symlink(share, link, 'junction');
  return link;
}

function shareLinkFor(parentDir) {
  return path.join(parentDir, 'oneheal-pg-share');
}

async function removeShareLink(parentDir) {
  const link = shareLinkFor(parentDir);
  const existing = await lstat(link).catch(() => undefined);
  if (existing?.isSymbolicLink()) await rmdir(link);
}

/** Removes the data directory; Windows reports EBUSY/EPERM briefly after taskkill, so retry. */
async function removeDataDir(dir) {
  try {
    await rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    return true;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : error;
    console.warn(`embedded-db: could not remove ${dir} (${code}); run "npm run db:reset" later.`);
    return false;
  }
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    const done = (inUse) => {
      socket.destroy();
      resolve(inUse);
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Starts a fresh cluster. Resolves to { url, port, dataDir, startedInMs, stop() }.
 * @param {{ port?: number, dataDir?: string, verbose?: boolean }} [options]
 */
export async function startEmbeddedDb(options = {}) {
  const port = options.port ?? resolvePort();
  const dataDir = options.dataDir ?? dataDirFor(port);
  const verbose = options.verbose ?? process.env.DB_VERBOSE === '1';
  assertAsciiPath(dataDir);

  if (await portInUse(port)) {
    throw new Error(
      `embedded-db: port ${port} is already in use. Stop the other PostgreSQL ` +
        '(an "npm run db:up" session?) or set DB_PORT.',
    );
  }
  await removeDataDir(dataDir); // a crashed previous run leaves initdb output behind
  const shareDir = await asciiShareDir(path.dirname(dataDir));

  const tail = [];
  const onLog = (message) => {
    const text = String(message).trim();
    if (text) tail.push(text);
    if (tail.length > LOG_TAIL_LINES) tail.shift();
    if (verbose) process.stderr.write(`${text}\n`);
  };
  const cluster = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: DB_USER,
    password: DB_PASSWORD,
    authMethod: 'scram-sha-256',
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C', ...(shareDir ? ['-L', shareDir] : [])],
    // Throwaway data: trade durability for speed. Loopback only.
    postgresFlags: [
      ...['-c', 'listen_addresses=127.0.0.1'],
      ...['-c', 'fsync=off', '-c', 'synchronous_commit=off', '-c', 'full_page_writes=off'],
    ],
    onLog,
    onError: onLog,
  });

  const startedAt = Date.now();
  try {
    await withTimeout(cluster.initialise(), START_TIMEOUT_MS, 'initdb');
    await withTimeout(cluster.start(), START_TIMEOUT_MS, 'postgres start');
  } catch (error) {
    // The library rejects start() when postgres exits early; its stop() would then wait forever
    // for an "exit" event that already fired, so detach the dead process before cleaning up.
    cluster.process = undefined;
    await removeDataDir(dataDir);
    const reason = error instanceof Error ? error.message : 'postgres exited before it was ready';
    throw new Error(
      `embedded-db: failed to start PostgreSQL on port ${port}: ${reason}\n${tail.join('\n')}`,
    );
  }

  let stopping;
  const stop = () => {
    stopping ??= (async () => {
      try {
        await cluster.stop(); // taskkill/SIGINT, then rm of the data dir (may throw EBUSY on Windows)
      } catch (error) {
        onLog(`stop: ${error instanceof Error ? error.message : String(error)}`);
      }
      await removeDataDir(dataDir);
    })();
    return stopping;
  };

  return { url: databaseUrlFor(port), port, dataDir, startedInMs: Date.now() - startedAt, stop };
}

/** Spawns a command with stdio inherited; on Windows .cmd shims need a shell, so retry with one. */
function runChild([file, ...args], env, shell = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: 'inherit', env, shell });
    child.on('error', (error) => {
      if (!shell && process.platform === 'win32') {
        runChild([file, ...args], env, true).then(resolve, reject);
      } else {
        reject(error);
      }
    });
    child.on('close', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function cliRun(rest) {
  const separator = rest.indexOf('--');
  const command = separator === -1 ? rest : rest.slice(separator + 1);
  if (command.length === 0) throw new Error('usage: embedded.mjs run -- <command> [args...]');

  const db = await startEmbeddedDb();
  process.stderr.write(`embedded-db: ready on ${db.url} (${db.startedInMs} ms)\n`);
  try {
    process.exitCode = await runChild(command, { ...process.env, DATABASE_URL: db.url });
  } finally {
    await db.stop();
  }
}

async function cliUp(rest) {
  const db = await startEmbeddedDb();
  try {
    if (!rest.includes('--no-migrate')) {
      const { migrate } = await import('./migrate.mjs');
      await migrate({ databaseUrl: db.url, seed: true });
    }
  } catch (error) {
    await db.stop();
    throw error;
  }
  process.stdout.write(`DATABASE_URL=${db.url}\n`);
  process.stderr.write('embedded-db: running; press Ctrl+C to stop (the data is discarded).\n');
  await new Promise((resolve) => {
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.once(signal, () => resolve());
  });
  await db.stop();
}

async function cliReset() {
  const port = resolvePort();
  const dataDir = dataDirFor(port);
  if (await portInUse(port)) {
    console.warn(`embedded-db: something still listens on port ${port}; stop it first.`);
  }
  const removed = await removeDataDir(dataDir);
  await removeShareLink(path.dirname(dataDir));
  process.stdout.write(`embedded-db: ${removed ? 'removed' : 'could not remove'} ${dataDir}\n`);
  if (!removed) process.exitCode = 1;
}

const COMMANDS = { run: cliRun, up: cliUp, reset: cliReset };

async function main(argv) {
  const [command, ...rest] = argv;
  const handler = COMMANDS[command];
  if (!handler) {
    throw new Error(`usage: embedded.mjs <run -- <command> | up [--no-migrate] | reset>`);
  }
  await handler(rest);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // embedded-postgres registers async-exit-hook, which exits with its own code on the "exit"
  // event and would override process.exitCode, so the code is passed to process.exit explicitly.
  main(process.argv.slice(2)).then(
    () => process.exit(process.exitCode ?? 0),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    },
  );
}
