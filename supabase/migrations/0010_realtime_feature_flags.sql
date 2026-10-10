-- 0010 Realtime: publish public.feature_flags so the app follows flag changes live
-- (SupabaseFlagProvider, ADR-031). RLS still applies to postgres_changes: authenticated users
-- receive the rows feature_flags_select lets them read; anon receives nothing.
-- Supabase creates the supabase_realtime publication; a plain PostgreSQL (the embedded test
-- cluster, a self-hosted database without Realtime) has none, and this migration is a no-op there.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feature_flags'
     ) then
    execute 'alter publication supabase_realtime add table public.feature_flags';
  end if;
end $$;
