/**
 * Row factories for schema tests. They run with the connection's own role (postgres, bypasses
 * RLS) and must be called before `asUser`/`asAnon`, or after `resetRole`.
 */
import { randomUUID } from 'node:crypto';

import { createAuthUser, type DbClient, type TestUser } from '../_harness/db';

export const TASHKENT = { lat: 41.311, lng: 69.279 };

export const i18n = (ru: string) => JSON.stringify({ ru, uz: `${ru} uz`, en: `${ru} en` });

function slug(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export async function createCategory(client: DbClient, name = 'Gym'): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.venue_categories (slug, name, icon) values ($1, $2, 'dumbbell') returning id`,
    [slug('cat'), i18n(name)],
  );
  return rows[0]!.id;
}

export interface VenueInput {
  categoryId?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  lat?: number;
  lng?: number;
  tier?: number;
  tz?: string;
}

export async function createVenue(client: DbClient, input: VenueInput = {}): Promise<string> {
  const categoryId = input.categoryId ?? (await createCategory(client));
  const { rows } = await client.query<{ id: string }>(
    `insert into public.venues (slug, name, category_id, address, lat, lng, status, tier, tz)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [
      slug('venue'),
      i18n('Зал'),
      categoryId,
      i18n('Ташкент, ул. Тестовая 1'),
      input.lat ?? TASHKENT.lat,
      input.lng ?? TASHKENT.lng,
      input.status ?? 'active',
      input.tier ?? 1,
      input.tz ?? 'Asia/Tashkent',
    ],
  );
  return rows[0]!.id;
}

export async function addVenueStaff(
  client: DbClient,
  venueId: string,
  userId: string,
  role: 'owner' | 'staff' = 'staff',
): Promise<void> {
  await client.query(
    `insert into public.venue_staff (venue_id, user_id, role) values ($1, $2, $3)`,
    [venueId, userId, role],
  );
}

export async function createPlan(
  client: DbClient,
  code: 'basic' | 'standard' | 'premium' = 'basic',
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.plans (code, name, price_uzs, visits_per_month, max_venue_tier, per_venue_monthly_cap)
     values ($1, $2, 299000, 8, 1, 4)
     on conflict (code) do update set updated_at = now()
     returning id`,
    [code, i18n('Базовый')],
  );
  return rows[0]!.id;
}

export async function createSubscription(
  client: DbClient,
  userId: string,
  options: { planId?: string; status?: string } = {},
): Promise<string> {
  const planId = options.planId ?? (await createPlan(client));
  const { rows } = await client.query<{ id: string }>(
    `insert into public.subscriptions (user_id, plan_id, status, period_start, period_end)
     values ($1, $2, $3, now(), now() + interval '30 days') returning id`,
    [userId, planId, options.status ?? 'active'],
  );
  return rows[0]!.id;
}

export async function createBooking(
  client: DbClient,
  userId: string,
  venueId: string,
  subscriptionId: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.bookings (user_id, venue_id, subscription_id, starts_at, ends_at, idempotency_key)
     values ($1, $2, $3, now() + interval '1 day', now() + interval '1 day 1 hour', $4) returning id`,
    [userId, venueId, subscriptionId, randomUUID()],
  );
  return rows[0]!.id;
}

export async function createPayment(
  client: DbClient,
  userId: string,
  status = 'created',
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.payments (user_id, provider, amount_uzs, status, idempotency_key)
     values ($1, 'mock', 299000, $2, $3) returning id`,
    [userId, status, randomUUID()],
  );
  return rows[0]!.id;
}

export async function createVisit(
  client: DbClient,
  userId: string,
  venueId: string,
  subscriptionId: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into public.visits (user_id, venue_id, subscription_id, method, manual_reason)
     values ($1, $2, $3, 'manual', 'test') returning id`,
    [userId, venueId, subscriptionId],
  );
  return rows[0]!.id;
}

export async function createReview(
  client: DbClient,
  userId: string,
  venueId: string,
  rating: number,
  options: { status?: string; createdAt?: string } = {},
): Promise<string> {
  // Terminal status: a user may hold several reviews but only one live subscription.
  const subscriptionId = await createSubscription(client, userId, { status: 'expired' });
  const visitId = await createVisit(client, userId, venueId, subscriptionId);
  const { rows } = await client.query<{ id: string }>(
    `insert into public.reviews (user_id, venue_id, visit_id, rating, text, status, created_at)
     values ($1, $2, $3, $4, 'ok', $5, coalesce($6::timestamptz, now())) returning id`,
    [userId, venueId, visitId, rating, options.status ?? 'published', options.createdAt ?? null],
  );
  return rows[0]!.id;
}

export async function createMember(client: DbClient): Promise<TestUser> {
  return createAuthUser(client);
}

export async function grantRole(
  client: DbClient,
  userId: string,
  role: 'partner' | 'admin',
): Promise<void> {
  await client.query(
    `insert into public.user_roles (user_id, role) values ($1, $2) on conflict do nothing`,
    [userId, role],
  );
}
