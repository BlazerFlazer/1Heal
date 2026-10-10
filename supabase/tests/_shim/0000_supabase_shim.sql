-- 1Heal test-only shim: the parts of Supabase that migrations and RLS tests depend on
-- (roles, schema "extensions", schema "auth" with auth.users and the JWT helpers).
-- Applied by scripts/db/migrate.mjs only when the target has no schema "auth" (the embedded
-- PostgreSQL); the Supabase CLI never sees it. The guard below aborts on a real Supabase database.
do $$
begin
  if to_regproc('auth.uid') is not null then
    raise exception 'supabase shim: auth.uid() already exists; refusing to run on a Supabase database';
  end if;
end $$;

-- Roles, attributes as in supabase/postgres (migrations/db/init-scripts/00000000000000-initial-schema.sql).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
end $$;
grant anon, authenticated, service_role to authenticator;

-- Extensions live in schema "extensions", which is on the default search_path, as on Supabase.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
do $$
begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end $$;
set search_path = "$user", public, extensions;

-- Data API roles reach new objects in "public" without explicit grants (Supabase cloud default,
-- config.toml [api] auto_expose_new_tables). RLS still denies every row until a policy allows it.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Schema "auth": only auth.users (the columns the app and migrations reference) and the helpers.
create schema auth;
comment on schema auth is '1Heal test shim: emulates Supabase auth. Never present on a real Supabase database.';
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email text,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  phone text unique,
  phone_confirmed_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_super_admin boolean,
  banned_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false
);
grant all on auth.users to supabase_auth_admin;

-- Helpers as defined by supabase/postgres: PostgREST publishes the JWT as request.jwt.claims
-- (json text); the legacy per-claim settings request.jwt.claim.<name> are honoured first.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )::text
$$;
create function auth.email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
  )::text
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
grant execute on function auth.uid(), auth.role(), auth.email(), auth.jwt()
  to anon, authenticated, service_role;
