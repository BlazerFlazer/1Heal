-- 0001 extensions: everything 1Heal needs on both targets (Supabase local/cloud and the embedded
-- PostgreSQL used by `npm run db:test`). On Supabase extensions live in schema "extensions" (on
-- the default search_path); on a plain cluster without that schema they go to "public".
-- Geo uses cube + earthdistance (not PostGIS, which the embedded cluster lacks).
do $$
declare
  target_schema text := case when to_regnamespace('extensions') is not null then 'extensions' else 'public' end;
  ext text;
begin
  foreach ext in array array['pgcrypto', 'cube', 'earthdistance', 'pg_trgm', 'citext', 'btree_gist'] loop
    execute format('create extension if not exists %I with schema %I', ext, target_schema);
  end loop;

  -- Supabase-only: pg_cron is scheduled by later milestones (M5 jobs); here it is only enabled.
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
  end if;
end $$;
