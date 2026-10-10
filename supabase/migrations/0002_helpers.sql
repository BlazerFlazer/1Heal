-- 0002 helpers: shared trigger functions, JWT role helpers, i18n check, audit log.
-- Helpers used inside RLS policies run as the invoking role, so they are granted to anon and
-- authenticated. Helpers that read tables are security definer with a pinned search_path.

-- updated_at ------------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Attaches set_updated_at to every public table with an updated_at column that lacks the trigger.
-- Called at the end of each migration that creates tables; idempotent.
create or replace function public.ensure_updated_at_triggers()
returns void
language plpgsql
set search_path = public
as $$
declare
  tbl record;
begin
  for tbl in
    select c.table_name
    from information_schema.columns c
    join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
    where c.table_schema = 'public' and c.column_name = 'updated_at'
      and not exists (
        select 1 from pg_trigger tg
        where tg.tgrelid = format('public.%I', c.table_name)::regclass
          and tg.tgname = 'set_updated_at' and not tg.tgisinternal
      )
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      tbl.table_name
    );
  end loop;
end $$;
revoke execute on function public.ensure_updated_at_triggers() from public, anon, authenticated;

-- JWT role helpers (roles are written to app_metadata.roles by custom_access_token_hook) ----------
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.app_role()
returns text[]
language sql
stable
as $$
  select coalesce(
    (select array_agg(value) from jsonb_array_elements_text(
      case when jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'roles') = 'array'
           then auth.jwt() -> 'app_metadata' -> 'roles' else '[]'::jsonb end)),
    '{}'::text[]
  )
$$;

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
as $$
  select p_role = any (public.app_role())
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.has_role('admin')
$$;

-- i18n --------------------------------------------------------------------------------------------
-- An object whose "ru" is a non-empty string; "uz" and "en" are optional strings.
create or replace function public.jsonb_i18n_valid(p_value jsonb)
returns boolean
language sql
immutable
as $$
  select coalesce(
    jsonb_typeof(p_value) = 'object'
      and jsonb_typeof(p_value -> 'ru') = 'string'
      and length(p_value ->> 'ru') > 0
      and (p_value -> 'uz' is null or jsonb_typeof(p_value -> 'uz') = 'string')
      and (p_value -> 'en' is null or jsonb_typeof(p_value -> 'en') = 'string'),
    false)
$$;

-- Audit log (seq orders rows written inside one transaction, where created_at ties) ---------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  actor_id uuid,
  actor_role text not null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
alter table public.audit_log enable row level security;

-- Generic row-change trigger: `create trigger audit after insert or update or delete on <t>
-- for each row execute function public.write_audit()`. Security definer so that any role whose
-- write passed RLS can append to the log without holding an insert grant on audit_log.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_after, v_before);
begin
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    case when auth.uid() is null then current_user else array_to_string(public.app_role(), ',') end,
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'jti'),
    v_before,
    v_after
  );
  return coalesce(new, old);
end $$;
revoke execute on function public.write_audit() from public, anon, authenticated;
