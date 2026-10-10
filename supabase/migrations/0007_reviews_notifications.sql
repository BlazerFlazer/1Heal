-- 0007 reviews (+ rating aggregate), review reports, notifications, notification preferences,
-- account deletion requests, feature flags.

do $$ begin create type public.review_status as enum ('published', 'hidden', 'under_review'); exception when duplicate_object then null; end $$;

-- reviews: one per visit ----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  visit_id uuid not null unique references public.visits (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text check (length(text) <= 2000),
  status public.review_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_venue_idx on public.reviews (venue_id, created_at desc) where status = 'published';
create index reviews_user_idx on public.reviews (user_id, created_at desc);
alter table public.reviews enable row level security;

-- venues.rating_avg / rating_count over published reviews only.
create or replace function public.refresh_venue_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venue uuid;
begin
  foreach v_venue in array array_remove(array[
    case when tg_op in ('INSERT', 'UPDATE') then new.venue_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.venue_id end
  ], null) loop
    update public.venues v
    set rating_avg = coalesce(agg.avg, 0), rating_count = coalesce(agg.cnt, 0)
    from (
      select round(avg(r.rating)::numeric, 2) as avg, count(*)::integer as cnt
      from public.reviews r
      where r.venue_id = v_venue and r.status = 'published'
    ) agg
    where v.id = v_venue;
  end loop;
  return coalesce(new, old);
end $$;
revoke execute on function public.refresh_venue_rating() from public, anon, authenticated;
create trigger refresh_venue_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_venue_rating();

-- Members may edit only rating and text of their own review, within 24 hours (RLS in 0008 adds the
-- ownership/time window); everything else is reserved for admins and server functions.
create or replace function public.guard_review_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
    new.user_id is distinct from old.user_id or new.venue_id is distinct from old.venue_id or
    new.visit_id is distinct from old.visit_id or new.status is distinct from old.status or
    new.created_at is distinct from old.created_at
  ) then
    raise exception 'members may change only rating and text of a review' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.guard_review_update() from public, anon, authenticated;
create trigger guard_review_update before update on public.reviews
  for each row execute function public.guard_review_update();

-- review_reports --------------------------------------------------------------------------------------
create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (length(reason) between 1 and 1000),
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
alter table public.review_reports enable row level security;

-- notifications -----------------------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title jsonb not null check (public.jsonb_i18n_valid(title)),
  body jsonb not null check (public.jsonb_i18n_valid(body)),
  data jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bookings boolean not null default true,
  reminders boolean not null default true,
  marketing boolean not null default false,
  quiet_hours jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;

-- account_deletion_requests --------------------------------------------------------------------------------
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  export_requested boolean not null default false,
  export_path text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index account_deletion_requests_open_idx on public.account_deletion_requests (user_id)
  where completed_at is null;
alter table public.account_deletion_requests enable row level security;

-- feature_flags --------------------------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  audience jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;

create trigger audit after insert or update or delete on public.feature_flags
  for each row execute function public.write_audit();
create trigger audit after update or delete on public.reviews
  for each row execute function public.write_audit();

select public.ensure_updated_at_triggers();
