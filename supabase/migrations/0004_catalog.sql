-- 0004 catalog: categories, venues (lat/lng + earthdistance index), photos, hours, trainers,
-- class templates, class sessions, favorites.

do $$ begin create type public.venue_status as enum ('draft', 'active', 'paused', 'archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.session_status as enum ('scheduled', 'cancelled', 'completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.class_level as enum ('any', 'beginner', 'intermediate', 'advanced'); exception when duplicate_object then null; end $$;

-- venue_categories --------------------------------------------------------------------------------
create table public.venue_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (public.jsonb_i18n_valid(name)),
  icon text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.venue_categories enable row level security;

-- venues --------------------------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name jsonb not null check (public.jsonb_i18n_valid(name)),
  description jsonb not null default '{"ru": ""}'::jsonb check (jsonb_typeof(description) = 'object'),
  category_id uuid not null references public.venue_categories (id) on delete restrict,
  tier smallint not null default 1 check (tier between 1 and 3),
  address jsonb not null check (public.jsonb_i18n_valid(address)),
  district text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  phone text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  website text,
  tz text not null default 'Asia/Tashkent',
  amenities text[] not null default '{}',
  women_only_hours jsonb,
  cancellation_window_min integer not null default 120 check (cancellation_window_min >= 0),
  price_tier smallint not null default 1 check (price_tier between 1 and 3),
  rating_avg numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  status public.venue_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- earthdistance (cube) point index used by rpc_nearby_venues: earth_box(...) @> ll_to_earth(lat, lng).
create index venues_earth_idx on public.venues using gist (ll_to_earth(lat, lng));
create index venues_status_category_idx on public.venues (status, category_id);
create index venues_name_ru_trgm_idx on public.venues using gin ((name ->> 'ru') gin_trgm_ops);
alter table public.venues enable row level security;

alter table public.venue_staff
  add constraint venue_staff_venue_id_fkey foreign key (venue_id)
  references public.venues (id) on delete cascade;

-- venue_photos --------------------------------------------------------------------------------------
create table public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  path text not null,
  sort integer not null default 0,
  blurhash text,
  created_at timestamptz not null default now(),
  unique (venue_id, path)
);
create index venue_photos_venue_idx on public.venue_photos (venue_id, sort);
alter table public.venue_photos enable row level security;

-- venue_hours: weekday 0 = Sunday .. 6 = Saturday (extract(dow)); closes <= opens means overnight.
create table public.venue_hours (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  women_only boolean not null default false,
  unique (venue_id, weekday, opens)
);
alter table public.venue_hours enable row level security;

-- trainers --------------------------------------------------------------------------------------------
create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  photo_path text,
  specialties text[] not null default '{}',
  bio jsonb not null default '{"ru": ""}'::jsonb check (jsonb_typeof(bio) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trainers_venue_idx on public.trainers (venue_id);
alter table public.trainers enable row level security;

-- class_templates ---------------------------------------------------------------------------------------
create table public.class_templates (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name jsonb not null check (public.jsonb_i18n_valid(name)),
  description jsonb not null default '{"ru": ""}'::jsonb check (jsonb_typeof(description) = 'object'),
  duration_min integer not null check (duration_min between 5 and 600),
  capacity integer not null check (capacity between 1 and 1000),
  trainer_id uuid references public.trainers (id) on delete set null,
  level public.class_level not null default 'any',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index class_templates_venue_idx on public.class_templates (venue_id) where active;
alter table public.class_templates enable row level security;

-- class_sessions ----------------------------------------------------------------------------------------
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.class_templates (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  trainer_id uuid references public.trainers (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 1000),
  booked_count integer not null default 0 check (booked_count >= 0),
  waitlist_count integer not null default 0 check (waitlist_count >= 0),
  status public.session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index class_sessions_venue_starts_idx on public.class_sessions (venue_id, starts_at);
create index class_sessions_template_idx on public.class_sessions (template_id, starts_at);
alter table public.class_sessions enable row level security;

-- favorites ----------------------------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
alter table public.favorites enable row level security;

create trigger audit after insert or update or delete on public.venues
  for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.venue_staff
  for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.user_roles
  for each row execute function public.write_audit();

select public.ensure_updated_at_triggers();
