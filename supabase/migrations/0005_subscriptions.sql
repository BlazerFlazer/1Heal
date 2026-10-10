-- 0005 subscriptions and money: plans, subscriptions (+ ledger, freezes), payments (+ state
-- machine trigger, ledger), payment methods, webhook inbox, payouts. Money is integer UZS.

do $$ begin create type public.plan_code as enum ('basic', 'standard', 'premium'); exception when duplicate_object then null; end $$;
do $$ begin create type public.subscription_status as enum ('pending_payment', 'active', 'past_due', 'frozen', 'cancelled', 'expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_provider as enum ('payme', 'click', 'uzum', 'mock'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('created', 'pending', 'paid', 'failed', 'refunded', 'disputed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_event_source as enum ('client', 'webhook', 'admin', 'system'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payout_status as enum ('draft', 'approved', 'paid'); exception when duplicate_object then null; end $$;

-- plans ---------------------------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code public.plan_code not null unique,
  name jsonb not null check (public.jsonb_i18n_valid(name)),
  price_uzs integer not null check (price_uzs >= 0),
  visits_per_month integer not null check (visits_per_month > 0),
  max_venue_tier smallint not null check (max_venue_tier between 1 and 3),
  per_venue_monthly_cap integer not null check (per_venue_monthly_cap > 0),
  perks jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;

-- subscriptions ----------------------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'pending_payment',
  period_start timestamptz not null,
  period_end timestamptz not null,
  auto_renew boolean not null default true,
  visits_used integer not null default 0 check (visits_used >= 0),
  cancel_at timestamptz,
  frozen_until timestamptz,
  scheduled_plan_id uuid references public.plans (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start)
);
-- One non-terminal subscription per user.
create unique index subscriptions_one_active_per_user_idx on public.subscriptions (user_id)
  where status not in ('cancelled', 'expired');
create index subscriptions_user_idx on public.subscriptions (user_id, created_at desc);
alter table public.subscriptions enable row level security;

create table public.subscription_freezes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '30 days')
);
create index subscription_freezes_sub_idx on public.subscription_freezes (subscription_id, starts_at);
alter table public.subscription_freezes enable row level security;

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);
create index subscription_events_sub_idx on public.subscription_events (subscription_id, seq);
alter table public.subscription_events enable row level security;

create or replace function public.log_subscription_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.subscription_events (subscription_id, type, payload, actor)
    values (new.id, 'created', jsonb_build_object('status', new.status, 'plan_id', new.plan_id), auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.subscription_events (subscription_id, type, payload, actor)
    values (new.id, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status), auth.uid());
  end if;
  return new;
end $$;
revoke execute on function public.log_subscription_event() from public, anon, authenticated;
create trigger log_subscription_event after insert or update of status on public.subscriptions
  for each row execute function public.log_subscription_event();

-- payments -----------------------------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider public.payment_provider not null,
  provider_txn_id text,
  amount_uzs integer not null check (amount_uzs >= 0),
  status public.payment_status not null default 'created',
  idempotency_key text not null unique,
  paid_at timestamptz,
  receipt_url text,
  fiscal_receipt jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_txn_id)
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_subscription_idx on public.payments (subscription_id);
alter table public.payments enable row level security;

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  payment_id uuid not null references public.payments (id) on delete cascade,
  from_status public.payment_status,
  to_status public.payment_status not null,
  source public.payment_event_source not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index payment_events_payment_idx on public.payment_events (payment_id, seq);
alter table public.payment_events enable row level security;

-- State machine. Allowed: created -> pending|failed, pending -> paid|failed, paid -> refunded|disputed,
-- disputed -> refunded|paid. Anything else raises P0001 (before update). Every insert and status
-- change is appended to payment_events (after row). Source: set_config('oneheal.payment_event_source',
-- ..., true) by the writing function (webhook handlers), else admin JWT -> admin, no JWT -> system,
-- else client. Raw provider payload: set_config('oneheal.payment_event_raw', '<json>', true).
create or replace function public.enforce_payment_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if not (
    (old.status = 'created' and new.status in ('pending', 'failed')) or
    (old.status = 'pending' and new.status in ('paid', 'failed')) or
    (old.status = 'paid' and new.status in ('refunded', 'disputed')) or
    (old.status = 'disputed' and new.status in ('refunded', 'paid'))
  ) then
    raise exception 'payment status transition % -> % is not allowed', old.status, new.status
      using errcode = 'P0001';
  end if;
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.enforce_payment_transition() from public, anon, authenticated;
create trigger enforce_payment_transition before update of status on public.payments
  for each row execute function public.enforce_payment_transition();

create or replace function public.log_payment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.payment_event_source;
  v_raw jsonb;
begin
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;
  v_source := coalesce(
    nullif(current_setting('oneheal.payment_event_source', true), '')::public.payment_event_source,
    case
      when public.is_admin() then 'admin'::public.payment_event_source
      when auth.uid() is null then 'system'::public.payment_event_source
      else 'client'::public.payment_event_source
    end
  );
  v_raw := coalesce(nullif(current_setting('oneheal.payment_event_raw', true), '')::jsonb, '{}'::jsonb);
  insert into public.payment_events (payment_id, from_status, to_status, source, raw)
  values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, v_source, v_raw);
  return new;
end $$;
revoke execute on function public.log_payment_event() from public, anon, authenticated;
create trigger log_payment_event after insert or update of status on public.payments
  for each row execute function public.log_payment_event();

-- payment_methods: provider_token never reaches the client (column grants in 0008) ----------------------
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.payment_provider not null,
  provider_token text not null,
  masked_pan text not null check (masked_pan ~ '^[0-9]{4,6}\*+[0-9]{4}$' or masked_pan ~ '^\*+[0-9]{4}$'),
  expiry text check (expiry ~ '^(0[1-9]|1[0-2])/[0-9]{2}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_token)
);
create unique index payment_methods_one_default_idx on public.payment_methods (user_id) where is_default;
alter table public.payment_methods enable row level security;

-- webhook_inbox: idempotent provider callbacks ------------------------------------------------------------
create table public.webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  external_id text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, external_id)
);
create index webhook_inbox_unprocessed_idx on public.webhook_inbox (received_at) where processed_at is null;
alter table public.webhook_inbox enable row level security;

-- payouts --------------------------------------------------------------------------------------------------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  visits_count integer not null default 0 check (visits_count >= 0),
  amount_uzs integer not null default 0 check (amount_uzs >= 0),
  status public.payout_status not null default 'draft',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (venue_id, period_start, period_end)
);
alter table public.payouts enable row level security;

create trigger audit after insert or update or delete on public.plans
  for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.subscriptions
  for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.payments
  for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.payouts
  for each row execute function public.write_audit();

select public.ensure_updated_at_triggers();
