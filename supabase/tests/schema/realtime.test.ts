import { readFileSync } from 'node:fs';
import path from 'node:path';

import { type DbClient, runInTransaction } from '../_harness/db';

const MIGRATION = path.resolve(__dirname, '../../migrations/0010_realtime_feature_flags.sql');

async function publishedTables(client: DbClient): Promise<string[]> {
  const { rows } = await client.query<{ table: string }>(
    `select schemaname || '.' || tablename as table
       from pg_publication_tables
      where pubname = 'supabase_realtime'
      order by 1`,
  );
  return rows.map((row) => row.table);
}

describe('realtime publication (0010)', () => {
  test('feature_flags is published wherever supabase_realtime exists', async () => {
    await runInTransaction(async (client) => {
      const { rows } = await client.query<{ exists: boolean }>(
        `select exists (select 1 from pg_publication where pubname = 'supabase_realtime')`,
      );
      if (rows[0]?.exists) {
        // Supabase local: the migration ran through the CLI or the harness.
        expect(await publishedTables(client)).toContain('public.feature_flags');
      } else {
        // Plain PostgreSQL: the migration was a no-op and created nothing.
        expect(await publishedTables(client)).toEqual([]);
      }
    });
  });

  test('adds the table once and is idempotent when the publication exists', async () => {
    await runInTransaction(async (client) => {
      await client.query(`do $$ begin
        if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
          create publication supabase_realtime;
        end if;
      end $$`);
      const sql = readFileSync(MIGRATION, 'utf8');
      await client.query(sql);
      await client.query(sql);
      const tables = await publishedTables(client);
      expect(tables.filter((table) => table === 'public.feature_flags')).toHaveLength(1);
    });
  });
});
