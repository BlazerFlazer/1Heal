-- 0090 sms_send_log policies: the rate-limit check the auth-sms-hook Edge Function calls through
-- the Data API (rpc/sms_rate_limit_check) with the service role before every OTP SMS. The table,
-- its (phone_e164, created_at) and (ip, created_at) indexes come from 0003_identity.sql, its grants
-- and the admin read policy from 0008_rls.sql; only service_role writes rows (the hook).
--
-- Limits (ADR-003, mirrored by supabase/functions/_shared/hooks/rateLimiter.ts for unit tests):
--   per phone: 3 in 10 minutes, 10 in 24 hours;  per IP: 20 in 1 hour.
-- Only attempts handed to a provider count (status 'sent' or 'failed'); 'rate_limited' rows are
-- written for visibility and do not extend a lockout. Windows are per purpose ('otp' here).
--
-- Returns jsonb: {"allowed": true} or
--   {"allowed": false, "scope": "phone"|"ip", "rule": "phone_10m"|"phone_24h"|"ip_1h",
--    "retry_after_sec": n}  where n is when enough of the oldest attempts have left the window.
create or replace function public.sms_rate_limit_check(
  p_phone_e164 text,
  p_ip text default null,
  p_purpose text default 'otp',
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_ip inet;
  v_rule record;
  v_count integer;
  v_releasing timestamptz;
begin
  if p_phone_e164 is null or p_phone_e164 = '' then
    raise exception 'sms_rate_limit_check: p_phone_e164 is required' using errcode = '22023';
  end if;

  -- Auth reports whatever it saw ("unknown", a proxy list); anything that is not an address is
  -- treated as absent rather than failing the sign-in.
  begin
    v_ip := nullif(trim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  for v_rule in
    select *
    from (values
      ('phone', 'phone_10m', 3, interval '10 minutes'),
      ('phone', 'phone_24h', 10, interval '24 hours'),
      ('ip', 'ip_1h', 20, interval '1 hour')
    ) as r (scope, rule, max_count, window_len)
  loop
    continue when v_rule.scope = 'ip' and v_ip is null;

    select count(*)
    into v_count
    from public.sms_send_log l
    where l.purpose = p_purpose
      and l.status in ('sent', 'failed')
      and l.created_at > p_now - v_rule.window_len
      and l.created_at <= p_now
      and case when v_rule.scope = 'phone' then l.phone_e164 = p_phone_e164 else l.ip = v_ip end;

    if v_count >= v_rule.max_count then
      -- The attempt whose expiry brings the count below the limit.
      select l.created_at
      into v_releasing
      from public.sms_send_log l
      where l.purpose = p_purpose
        and l.status in ('sent', 'failed')
        and l.created_at > p_now - v_rule.window_len
        and l.created_at <= p_now
        and case when v_rule.scope = 'phone' then l.phone_e164 = p_phone_e164 else l.ip = v_ip end
      order by l.created_at asc
      offset v_count - v_rule.max_count
      limit 1;

      return jsonb_build_object(
        'allowed', false,
        'scope', v_rule.scope,
        'rule', v_rule.rule,
        'retry_after_sec',
          greatest(1, ceil(extract(epoch from (v_releasing + v_rule.window_len - p_now)))::integer)
      );
    end if;
  end loop;

  return jsonb_build_object('allowed', true);
end $$;

-- Invoker rights: only service_role (bypasses RLS, granted all on the table in 0008) may call it.
-- Revoked explicitly because Supabase's default privileges grant execute on new functions.
revoke execute on function public.sms_rate_limit_check(text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.sms_rate_limit_check(text, text, text, timestamptz)
  to service_role;
