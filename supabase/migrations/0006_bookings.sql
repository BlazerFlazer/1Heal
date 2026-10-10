-- 0006 bookings and visits: bookings (+ ledger trigger), visits, qr_tokens, checkin_attempts,
-- penalties. Booking logic (quota, waitlist, cancellation) arrives in M5 as rpc_* functions.

do $$ begin create type public.booking_status as enum ('confirmed', 'waitlisted', 'cancelled', 'checked_in', 'no_show', 'expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.visit_method as enum ('qr', 'manual'); exception when duplicate_object then null; end $$;
do $$ begin create type public.penalty_kind as enum ('no_show_block'); exception when duplicate_object then null; end $$;

-- bookings ----------------------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete restrict,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  class_session_id uuid references public.class_sessions (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  waitlist_position integer check (waitlist_position > 0),
  idempotency_key text not null unique,
  cancelled_at timestamptz,
  cancel_reason text,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (status <> 'waitlisted' or waitlist_position is not null)
);
create unique index bookings_one_per_session_idx on public.bookings (user_id, class_session_id)
  where status in ('confirmed', 'waitlisted');
create index bookings_user_starts_idx on public.bookings (user_id, starts_at desc);
create index bookings_venue_starts_idx on public.bookings (venue_id, starts_at);
create index bookings_session_idx on public.bookings (class_session_id) where class_session_id is not null;
alter table public.bookings enable row level security;

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  type text not null,
  from_status public.booking_status,
  to_status public.booking_status,
  payload jsonb not null default '{}'::jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, seq);
alter table public.booking_events enable row level security;

create or replace function public.log_booking_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, type, from_status, to_status, payload, actor)
    values (new.id, 'created', null, new.status,
            jsonb_build_object('class_session_id', new.class_session_id, 'starts_at', new.starts_at),
            auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.booking_events (booking_id, type, from_status, to_status, payload, actor)
    values (new.id, 'status_changed', old.status, new.status,
            jsonb_build_object('cancel_reason', new.cancel_reason, 'waitlist_position', new.waitlist_position),
            auth.uid());
  end if;
  return new;
end $$;
revoke execute on function public.log_booking_event() from public, anon, authenticated;
create trigger log_booking_event after insert or update of status on public.bookings
  for each row execute function public.log_booking_event();

-- qr_tokens: single use, claimed by `update ... where used_at is null returning *` (M6) ----------------
create table public.qr_tokens (
  jti uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_venue_id uuid references public.venues (id) on delete set null,
  check (expires_at > issued_at)
);
create index qr_tokens_user_idx on public.qr_tokens (user_id, issued_at desc);
create index qr_tokens_expiry_idx on public.qr_tokens (expires_at) where used_at is null;
alter table public.qr_tokens enable row level security;

-- visits ----------------------------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  method public.visit_method not null,
  staff_user_id uuid references public.profiles (id) on delete set null,
  manual_reason text,
  qr_jti uuid references public.qr_tokens (jti) on delete set null,
  created_at timestamptz not null default now(),
  unique (booking_id),
  unique (qr_jti),
  check (method <> 'manual' or (manual_reason is not null and length(manual_reason) > 0)),
  check (method <> 'qr' or qr_jti is not null)
);
create index visits_user_idx on public.visits (user_id, checked_in_at desc);
create index visits_venue_idx on public.visits (venue_id, checked_in_at desc);
create index visits_subscription_idx on public.visits (subscription_id, checked_in_at);
alter table public.visits enable row level security;

-- checkin_attempts (audit of every scan, successful or not) --------------------------------------------
create table public.checkin_attempts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  staff_user_id uuid references public.profiles (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  jti uuid,
  result_code text not null,
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);
create index checkin_attempts_venue_idx on public.checkin_attempts (venue_id, created_at desc);
alter table public.checkin_attempts enable row level security;

-- penalties ----------------------------------------------------------------------------------------------
create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.penalty_kind not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  source_booking_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index penalties_user_active_idx on public.penalties (user_id, ends_at desc);
alter table public.penalties enable row level security;

create trigger audit after insert or update or delete on public.penalties
  for each row execute function public.write_audit();

select public.ensure_updated_at_triggers();
