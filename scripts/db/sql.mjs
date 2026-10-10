#!/usr/bin/env node
/**
 * psql stand-in over DATABASE_URL (or the embedded default from scripts/db/config.mjs).
 *
 *   node scripts/db/sql.mjs "select * from plans"           run one statement
 *   node scripts/db/sql.mjs -f supabase/seed.sql            run a file
 *   node scripts/db/sql.mjs                                  interactive; statements end with ";", \q quits
 *
 * Options: --as anon|authenticated|service_role [--sub <uuid>]   run under RLS as that role
 *          --url <database-url>
 * Rows print as JSON lines; commands print their row count.
 */
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import readline from 'node:readline';

import pg from 'pg';

import { maskUrl, resolveDatabaseUrl } from './config.mjs';

const ROLES = new Set(['anon', 'authenticated', 'service_role']);

function parseArgs(argv) {
  const options = {
    url: undefined,
    as: undefined,
    sub: undefined,
    file: undefined,
    sql: undefined,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') options.url = argv[++i];
    else if (arg === '--as') options.as = argv[++i];
    else if (arg === '--sub') options.sub = argv[++i];
    else if (arg === '-f' || arg === '--file') options.file = argv[++i];
    else if (arg.startsWith('-')) throw new Error(`unknown option "${arg}"`);
    else options.sql = options.sql ? `${options.sql} ${arg}` : arg;
  }
  if (options.as && !ROLES.has(options.as))
    throw new Error('--as must be anon, authenticated or service_role');
  return options;
}

function printResult(result) {
  for (const row of result.rows) process.stdout.write(`${JSON.stringify(row)}\n`);
  const count = result.rowCount ?? 0;
  process.stdout.write(`${result.command ?? 'OK'} ${count} row${count === 1 ? '' : 's'}\n`);
}

async function execute(client, sql) {
  const result = await client.query(sql);
  for (const part of Array.isArray(result) ? result : [result]) printResult(part);
}

async function assumeRole(client, role, sub) {
  // Session-level (not "local"): interactive statements are separate transactions.
  await client.query(`set role ${role}`);
  const claims = role === 'authenticated' ? { role, sub, aud: 'authenticated' } : { role };
  await client.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify(claims),
  ]);
}

function interactive(client) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sql> ',
  });
  let buffer = '';
  rl.prompt();
  return new Promise((resolve) => {
    rl.on('line', async (line) => {
      if (line.trim() === '\\q') return rl.close();
      buffer += `${line}\n`;
      if (buffer.trimEnd().endsWith(';')) {
        const sql = buffer;
        buffer = '';
        try {
          await execute(client, sql);
        } catch (error) {
          console.error(`ERROR ${error.code ?? ''} ${error.message}`);
        }
      }
      rl.setPrompt(buffer ? '  -> ' : 'sql> ');
      rl.prompt();
    });
    rl.on('close', resolve);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = options.url ?? resolveDatabaseUrl();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (options.as) await assumeRole(client, options.as, options.sub);
    if (options.file) await execute(client, await readFile(options.file, 'utf8'));
    else if (options.sql) await execute(client, options.sql);
    else {
      process.stderr.write(`connected to ${maskUrl(url)}; statements end with ";", \\q quits\n`);
      await interactive(client);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`ERROR ${error.code ?? ''} ${error.message}`.trim());
  process.exitCode = 1;
});
