-- 0003 identity: profiles, roles, venue staff, devices, consents, sms log, auth.users trigger,
-- custom access token hook (app_metadata.roles from user_roles).

do $$ begin create type public.user_role as enum ('member', 'partner', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_locale as enum ('ru', 'uz', 'en'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_theme as enum ('system', 'light', 'dark'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gender as enum ('female', 'male'); exception when duplicate_object then null; end $$;
do $$ begin create type public.venue_staff_role as enum ('owner', 'staff'); exception when duplicate_object then null; end $$;
do $$ begin create type public.consent_kind as enum ('terms', 'privacy', 'marketing'); exception when duplicate_object then null; end $$;
do $$ begin create type public.device_platform as enum ('ios', 'android', 'web'); exception when duplicate_object then null; end $$;

-- profiles ----------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone_e164 text unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  full_name text check (length(full_name) <= 120),
  avatar_path text,
  locale public.app_locale not null default 'ru',
  theme public.app_theme not null default 'system',
  birth_date date check (birth_date > date '1900-01-01' and birth_date < current_date),
  gender public.gender,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  marketing_consent_at timestamptz,
  biometric_lock boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- user_roles --------------------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

-- venue_staff (venues come in 0004; the FK is added there) ------------------------------------------
create table public.venue_staff (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.venue_staff_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, user_id)
);
create index venue_staff_user_idx on public.venue_staff (user_id) where active;
alter table public.venue_staff enable row level security;

-- Security definer: policies on venue_staff itself call it without recursion.
create or replace function public.is_venue_staff(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.venue_staff s
    where s.venue_id = p_venue_id and s.user_id = auth.uid() and s.active
  )
$$;

create or replace function public.is_venue_owner(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.venue_staff s
    where s.venue_id = p_venue_id and s.user_id = auth.uid() and s.active and s.role = 'owner'
  )
$$;

-- devices -----------------------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform public.device_platform not null,
  push_token text,
  app_version text,
  device_name text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index devices_user_idx on public.devices (user_id) where revoked_at is null;
alter table public.devices enable row level security;

-- consents (append-only) ----------------------------------------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.consent_kind not null,
  version text not null,
  granted boolean not null,
  at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, kind, at desc);
alter table public.consents enable row level security;

-- sms_send_log (written by the auth-sms-hook Edge Function with the service role) -------------------
create table public.sms_send_log (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  purpose text not null,
  provider text not null,
  provider_msg_id text,
  status text not null,
  ip inet,
  created_at timestamptz not null default now()
);
create index sms_send_log_phone_idx on public.sms_send_log (phone_e164, created_at desc);
create index sms_send_log_ip_idx on public.sms_send_log (ip, created_at desc) where ip is not null;
alter table public.sms_send_log enable row level security;

-- auth.users -> profiles + member role --------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone_e164, full_name)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null else '+' || new.phone end,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'member')
  on conflict do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

create or replace function public.handle_auth_user_phone_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set phone_e164 = case when new.phone is null or new.phone = '' then null else '+' || new.phone end
  where id = new.id;
  return new;
end $$;
revoke execute on function public.handle_auth_user_phone_change() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row when (old.phone is distinct from new.phone)
  execute function public.handle_auth_user_phone_change();

-- custom access token hook: claims.app_metadata.roles := roles from user_roles -----------------------
-- Called by Supabase Auth (role supabase_auth_admin) on every token issue, see
-- supabase/config.toml [auth.hook.custom_access_token]. Returns the event with every original
-- claim kept. A user without rows gets [] (the app defaults to ['member']).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
end $$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_roles jsonb;
begin
  select coalesce(jsonb_agg(r.role::text order by r.role), '[]'::jsonb)
  into v_roles
  from public.user_roles r
  where r.user_id = (event ->> 'user_id')::uuid;

  v_claims := jsonb_set(
    v_claims,
    '{app_metadata}',
    coalesce(v_claims -> 'app_metadata', '{}'::jsonb) || jsonb_build_object('roles', v_roles)
  );
  return jsonb_set(event, '{claims}', v_claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on table public.user_roles to supabase_auth_admin;
create policy user_roles_auth_admin_read on public.user_roles
  as permissive for select to supabase_auth_admin using (true);

select public.ensure_updated_at_triggers();
