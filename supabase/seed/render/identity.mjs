/**
 * SQL for the catalog, feature flags and people (auth.users, profiles, roles, staff, devices,
 * consents, notification preferences, saved cards).
 */
import { columns, insertRows, valuesList } from '../lib/sql.mjs';
import { MINUTE_MS } from '../lib/time.mjs';

const T = (name) => `public.${name}`;
const sameAsCreated = { updated_at: (r) => r.createdAt };

export function renderCatalog(m) {
  return [
    insertRows(
      T('plans'),
      columns(
        'id:uuid, code:str, name:json, price_uzs:num, visits_per_month:num, max_venue_tier:num, ' +
          'per_venue_monthly_cap:num, perks:json, active:bool, sort:num',
        { active: () => true },
      ),
      m.plans,
    ),
    insertRows(
      T('venue_categories'),
      columns('id:uuid, slug:str, name:json, icon:str, sort:num'),
      m.categories,
    ),
    insertRows(
      T('venues'),
      columns(
        'id:uuid, slug:str, name:json, description:json, category_id:uuid, tier:num, address:json, ' +
          'district:str, lat:num, lng:num, phone:str, website:str, tz:str, amenities:textArray, ' +
          'women_only_hours:json, cancellation_window_min:num, price_tier:num, status:str, ' +
          'created_at:ts, updated_at:ts',
        sameAsCreated,
      ),
      m.venues,
    ),
    insertRows(
      T('venue_photos'),
      columns('id:uuid, venue_id:uuid, path:str, sort:num, blurhash:str'),
      m.photos,
    ),
    insertRows(
      T('venue_hours'),
      columns('id:uuid, venue_id:uuid, weekday:num, opens:str, closes:str, women_only:bool'),
      m.hours,
    ),
    insertRows(
      T('trainers'),
      columns('id:uuid, venue_id:uuid, name:str, specialties:textArray, bio:json'),
      m.trainers,
    ),
    insertRows(
      T('class_templates'),
      columns(
        'id:uuid, venue_id:uuid, name:json, description:json, duration_min:num, capacity:num, ' +
          'trainer_id:uuid, level:str',
      ),
      m.templates,
    ),
    insertRows(
      T('class_sessions'),
      columns(
        'id:uuid, template_id:uuid, venue_id:uuid, trainer_id:uuid, starts_at:ts, ends_at:ts, ' +
          'capacity:num, booked_count:num, waitlist_count:num, status:str',
      ),
      m.sessions,
      { chunk: 400 },
    ),
    insertRows(
      T('feature_flags'),
      columns('key:str, enabled:bool, payload:json, description:str'),
      m.flags,
    ),
  ].join('\n');
}

/**
 * auth.users: only the columns both targets share are always written; Supabase-only columns
 * (GoTrue scans some token columns as non-null strings) are filled when they exist. Phone sign-in
 * on Supabase also wants an auth.identities row, written when that table exists.
 */
function renderAuthUsers(people) {
  const users = people.map((p) => ({
    id: p.id,
    phone: p.phone.replace(/^\+/, ''),
    created_at: new Date(p.signupAt).toISOString(),
    app: { provider: 'phone', providers: ['phone'] },
    meta: { locale: p.locale, full_name: p.fullName },
  }));
  return `do $seed$
declare
  v_users jsonb := $json$${JSON.stringify(users)}$json$::jsonb;
  v_cols text := 'id, phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at';
  v_vals text := 'u.id, u.phone, u.created_at, u.app, u.meta, u.created_at, u.created_at';
  v_col text;
begin
  foreach v_col in array array['instance_id', 'aud', 'role', 'is_anonymous', 'confirmation_token',
    'recovery_token', 'email_change_token_new', 'email_change', 'phone_change', 'phone_change_token',
    'email_change_token_current', 'reauthentication_token'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'auth' and table_name = 'users' and column_name = v_col) then
      v_cols := v_cols || ', ' || quote_ident(v_col);
      v_vals := v_vals || ', ' || case v_col
        when 'instance_id' then quote_literal('00000000-0000-0000-0000-000000000000') || '::uuid'
        when 'aud' then quote_literal('authenticated')
        when 'role' then quote_literal('authenticated')
        when 'is_anonymous' then 'false'
        else quote_literal('') end;
    end if;
  end loop;
  execute format('insert into auth.users (%s) select %s from jsonb_to_recordset($1) as u('
    'id uuid, phone text, created_at timestamptz, app jsonb, meta jsonb) on conflict do nothing',
    v_cols, v_vals) using v_users;

  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
    execute 'insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      select u.id::text, u.id, jsonb_build_object(''sub'', u.id::text, ''phone'', u.phone, ''phone_verified'', true),
             ''phone'', u.created_at, u.created_at, u.created_at
      from jsonb_to_recordset($1) as u(id uuid, phone text, created_at timestamptz)
      on conflict do nothing' using v_users;
  end if;
end
$seed$;
`;
}

/** profiles rows come from the on_auth_user_created trigger; complete them as onboarding would. */
function renderProfiles(people) {
  const cols = columns(
    'id:uuid, locale:str, theme:str, gender:str, birth_date:str, at:ts, marketing:bool, created_at:ts',
    { at: (p) => p.signupAt + MINUTE_MS, created_at: (p) => p.signupAt },
  );
  return `-- profiles rows come from the on_auth_user_created trigger; complete them as onboarding would.
update public.profiles p set
  locale = v.locale::public.app_locale, theme = v.theme::public.app_theme, gender = v.gender::public.gender,
  birth_date = v.birth_date::date, terms_accepted_at = v.at, privacy_accepted_at = v.at,
  marketing_consent_at = case when v.marketing then v.at end, created_at = v.created_at
from (values\n${valuesList(cols, people)}\n) as v(${cols.map(([name]) => name).join(', ')})
where p.id = v.id and p.terms_accepted_at is null;\n`;
}

export function renderPeople(m) {
  const roles = m.people
    .filter((p) => p.kind !== 'member')
    .map((p) => ({
      userId: p.id,
      role: p.kind === 'admin' ? 'admin' : 'partner',
      createdAt: p.signupAt,
    }));
  return [
    renderAuthUsers(m.people),
    renderProfiles(m.people),
    insertRows(T('user_roles'), columns('user_id:uuid, role:str, created_at:ts'), roles),
    insertRows(
      T('venue_staff'),
      columns(
        'id:uuid, venue_id:uuid, user_id:uuid, role:str, created_at:ts, updated_at:ts',
        sameAsCreated,
      ),
      m.staffLinks,
    ),
    insertRows(
      T('devices'),
      columns(
        'id:uuid, user_id:uuid, platform:str, app_version:str, device_name:str, last_seen_at:ts, ' +
          'created_at:ts, updated_at:ts',
        { updated_at: (d) => d.lastSeenAt },
      ),
      m.people.map((p) => p.device),
    ),
    insertRows(
      T('consents'),
      columns('id:uuid, user_id:uuid, kind:str, version:str, granted:bool, at:ts'),
      m.consents,
    ),
    insertRows(
      T('notification_preferences'),
      columns(
        'user_id:uuid, bookings:bool, reminders:bool, marketing:bool, quiet_hours:json, created_at:ts, updated_at:ts',
        { bookings: () => true, ...sameAsCreated },
      ),
      m.preferences,
    ),
    insertRows(
      T('payment_methods'),
      columns(
        'id:uuid, user_id:uuid, provider:str, provider_token:str, masked_pan:str, expiry:str, ' +
          'is_default:bool, created_at:ts, updated_at:ts',
        sameAsCreated,
      ),
      m.paymentMethods,
    ),
  ].join('\n');
}
