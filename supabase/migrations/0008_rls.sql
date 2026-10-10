-- 0008 RLS: every public table has row level security, anon/authenticated start from zero grants,
-- then explicit grants + policies per table. service_role bypasses RLS but still needs grants.
-- Matrix: docs/ARCHITECTURE.md. Writes to money/booking/visit tables happen only through the
-- service role or security definer rpc_* functions (M5-M7).

do $$
declare
  tbl text;
begin
  for tbl in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Helpers evaluated inside policies run as the calling role.
grant execute on function public.current_user_id(), public.app_role(), public.has_role(text),
  public.is_admin(), public.is_venue_staff(uuid), public.is_venue_owner(uuid), public.jsonb_i18n_valid(jsonb)
  to anon, authenticated, service_role;

create or replace function public.venue_is_active(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.venues v where v.id = p_venue_id and v.status = 'active')
$$;
grant execute on function public.venue_is_active(uuid) to anon, authenticated, service_role;

-- identity ----------------------------------------------------------------------------------------
grant select, update on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

grant select, insert, update, delete on public.user_roles to authenticated;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy user_roles_admin_write on public.user_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.venue_staff to authenticated;
create policy venue_staff_select on public.venue_staff for select to authenticated
  using (user_id = (select auth.uid()) or public.is_venue_owner(venue_id) or public.is_admin());
create policy venue_staff_insert on public.venue_staff for insert to authenticated
  with check (public.is_venue_owner(venue_id) or public.is_admin());
create policy venue_staff_update on public.venue_staff for update to authenticated
  using (public.is_venue_owner(venue_id) or public.is_admin())
  with check (public.is_venue_owner(venue_id) or public.is_admin());
create policy venue_staff_delete on public.venue_staff for delete to authenticated
  using (public.is_venue_owner(venue_id) or public.is_admin());

grant select, insert, update, delete on public.devices to authenticated;
create policy devices_owner on public.devices for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert on public.consents to authenticated;
create policy consents_select on public.consents for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy consents_insert on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select on public.sms_send_log to authenticated;
create policy sms_send_log_admin on public.sms_send_log for select to authenticated
  using (public.is_admin());

-- catalog -----------------------------------------------------------------------------------------
grant select on public.venue_categories to anon, authenticated;
grant insert, update, delete on public.venue_categories to authenticated;
create policy venue_categories_select on public.venue_categories for select to anon, authenticated
  using (true);
create policy venue_categories_admin_write on public.venue_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.venues to anon, authenticated;
grant insert, update, delete on public.venues to authenticated;
create policy venues_select on public.venues for select to anon, authenticated
  using (status = 'active' or public.is_venue_staff(id) or public.is_admin());
create policy venues_insert on public.venues for insert to authenticated
  with check (public.is_admin());
create policy venues_update on public.venues for update to authenticated
  using (public.is_venue_owner(id) or public.is_admin())
  with check (public.is_venue_owner(id) or public.is_admin());
create policy venues_delete on public.venues for delete to authenticated
  using (public.is_admin());

grant select on public.venue_photos, public.venue_hours, public.trainers, public.class_templates,
  public.class_sessions to anon, authenticated;
grant insert, update, delete on public.venue_photos, public.venue_hours, public.trainers,
  public.class_templates, public.class_sessions to authenticated;

create policy venue_photos_select on public.venue_photos for select to anon, authenticated
  using (public.venue_is_active(venue_id) or public.is_venue_staff(venue_id) or public.is_admin());
create policy venue_photos_staff_write on public.venue_photos for all to authenticated
  using (public.is_venue_staff(venue_id) or public.is_admin())
  with check (public.is_venue_staff(venue_id) or public.is_admin());

create policy venue_hours_select on public.venue_hours for select to anon, authenticated
  using (public.venue_is_active(venue_id) or public.is_venue_staff(venue_id) or public.is_admin());
create policy venue_hours_staff_write on public.venue_hours for all to authenticated
  using (public.is_venue_staff(venue_id) or public.is_admin())
  with check (public.is_venue_staff(venue_id) or public.is_admin());

create policy trainers_select on public.trainers for select to anon, authenticated
  using ((active and public.venue_is_active(venue_id)) or public.is_venue_staff(venue_id) or public.is_admin());
create policy trainers_staff_write on public.trainers for all to authenticated
  using (public.is_venue_staff(venue_id) or public.is_admin())
  with check (public.is_venue_staff(venue_id) or public.is_admin());

create policy class_templates_select on public.class_templates for select to anon, authenticated
  using ((active and public.venue_is_active(venue_id)) or public.is_venue_staff(venue_id) or public.is_admin());
create policy class_templates_staff_write on public.class_templates for all to authenticated
  using (public.is_venue_staff(venue_id) or public.is_admin())
  with check (public.is_venue_staff(venue_id) or public.is_admin());

create policy class_sessions_select on public.class_sessions for select to anon, authenticated
  using (public.venue_is_active(venue_id) or public.is_venue_staff(venue_id) or public.is_admin());
create policy class_sessions_staff_write on public.class_sessions for all to authenticated
  using (public.is_venue_staff(venue_id) or public.is_admin())
  with check (public.is_venue_staff(venue_id) or public.is_admin());

grant select, insert, delete on public.favorites to authenticated;
create policy favorites_owner on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- subscriptions and money (reads only; writes via service role / rpc_*) ---------------------------
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
create policy plans_select on public.plans for select to anon, authenticated
  using (active or public.is_admin());
create policy plans_admin_write on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.subscriptions, public.subscription_freezes, public.subscription_events,
  public.payments, public.payment_events, public.webhook_inbox, public.payouts to authenticated;
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy subscription_freezes_select on public.subscription_freezes for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id));
create policy subscription_events_select on public.subscription_events for select to authenticated
  using (exists (select 1 from public.subscriptions s where s.id = subscription_id));
create policy payments_select on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy payment_events_select on public.payment_events for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id));
create policy webhook_inbox_admin on public.webhook_inbox for select to authenticated
  using (public.is_admin());
create policy payouts_select on public.payouts for select to authenticated
  using (public.is_venue_owner(venue_id) or public.is_admin());

-- provider_token is never readable by the app: column-level select grant.
grant select (id, user_id, provider, masked_pan, expiry, is_default, created_at, updated_at),
  update (is_default), delete on public.payment_methods to authenticated;
create policy payment_methods_owner on public.payment_methods for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- bookings and visits (reads only; writes via rpc_* in M5/M6) ------------------------------------
grant select on public.bookings, public.booking_events, public.visits, public.qr_tokens,
  public.checkin_attempts, public.penalties to authenticated;
create policy bookings_select on public.bookings for select to authenticated
  using (user_id = (select auth.uid()) or public.is_venue_staff(venue_id) or public.is_admin());
create policy booking_events_select on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy visits_select on public.visits for select to authenticated
  using (user_id = (select auth.uid()) or public.is_venue_staff(venue_id) or public.is_admin());
create policy qr_tokens_select on public.qr_tokens for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy checkin_attempts_select on public.checkin_attempts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_venue_staff(venue_id) or public.is_admin());
create policy penalties_select on public.penalties for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- reviews, notifications, platform ----------------------------------------------------------------
grant select on public.reviews to anon, authenticated;
grant update, delete on public.reviews to authenticated;
create policy reviews_select on public.reviews for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid()) or public.is_admin());
create policy reviews_update on public.reviews for update to authenticated
  using (public.is_admin() or (user_id = (select auth.uid()) and created_at > now() - interval '24 hours'))
  with check (public.is_admin() or (user_id = (select auth.uid()) and created_at > now() - interval '24 hours'));
create policy reviews_delete on public.reviews for delete to authenticated
  using (public.is_admin());

grant select, insert, update on public.review_reports to authenticated;
create policy review_reports_select on public.review_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy review_reports_insert on public.review_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy review_reports_admin_update on public.review_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update, delete on public.notifications to authenticated;
create policy notifications_owner on public.notifications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update on public.notification_preferences to authenticated;
create policy notification_preferences_owner on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert on public.account_deletion_requests to authenticated;
create policy account_deletion_requests_select on public.account_deletion_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy account_deletion_requests_insert on public.account_deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.feature_flags to authenticated;
create policy feature_flags_select on public.feature_flags for select to authenticated using (true);
create policy feature_flags_admin_write on public.feature_flags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.audit_log to authenticated;
create policy audit_log_admin on public.audit_log for select to authenticated using (public.is_admin());
