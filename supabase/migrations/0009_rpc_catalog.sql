-- 0009 catalog RPCs: opening hours check and nearby search (cube/earthdistance, RLS respected).

-- Is the venue open at p_at (venue-local time)? weekday 0 = Sunday. A slot with closes <= opens
-- is overnight: it covers [opens, 24:00) of its weekday and [00:00, closes) of the next one.
create or replace function public.rpc_venue_is_open(p_venue_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.venues v
    cross join lateral (
      select extract(dow from (p_at at time zone v.tz))::smallint as dow,
             (p_at at time zone v.tz)::time as t
    ) l
    join public.venue_hours h on h.venue_id = v.id
    where v.id = p_venue_id
      and (
        (h.closes > h.opens and h.weekday = l.dow and l.t >= h.opens and l.t < h.closes)
        or (h.closes <= h.opens and h.weekday = l.dow and l.t >= h.opens)
        or (h.closes <= h.opens and h.weekday = (l.dow + 6) % 7 and l.t < h.closes)
      )
  )
$$;
grant execute on function public.rpc_venue_is_open(uuid, timestamptz) to anon, authenticated, service_role;

-- Active venues within p_radius_m of (p_lat, p_lng), nearest first. earth_box prefilters through
-- venues_earth_idx, earth_distance gives the exact great-circle distance in metres.
create or replace function public.rpc_nearby_venues(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 5000,
  p_category text default null,
  p_open_now boolean default false,
  p_limit integer default 50
)
returns table (
  id uuid,
  slug text,
  name jsonb,
  description jsonb,
  category_id uuid,
  category_slug text,
  tier smallint,
  address jsonb,
  district text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  tz text,
  amenities text[],
  women_only_hours jsonb,
  cancellation_window_min integer,
  price_tier smallint,
  rating_avg numeric,
  rating_count integer,
  status public.venue_status,
  distance_m integer
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    v.id, v.slug, v.name, v.description, v.category_id, c.slug as category_slug, v.tier, v.address,
    v.district, v.lat, v.lng, v.phone, v.website, v.tz, v.amenities, v.women_only_hours,
    v.cancellation_window_min, v.price_tier, v.rating_avg, v.rating_count, v.status,
    round(earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(v.lat, v.lng)))::integer as distance_m
  from public.venues v
  join public.venue_categories c on c.id = v.category_id
  where v.status = 'active'
    and earth_box(ll_to_earth(p_lat, p_lng), greatest(p_radius_m, 0)) @> ll_to_earth(v.lat, v.lng)
    and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(v.lat, v.lng)) <= greatest(p_radius_m, 0)
    and (p_category is null or c.slug = p_category)
    and (not p_open_now or public.rpc_venue_is_open(v.id, now()))
  order by distance_m, v.id
  limit least(greatest(p_limit, 1), 200)
$$;
grant execute on function public.rpc_nearby_venues(double precision, double precision, integer, text, boolean, integer)
  to anon, authenticated, service_role;
