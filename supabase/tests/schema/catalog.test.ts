import { asAnon, asUser, runInTransaction } from '../_harness/db';
import {
  addVenueStaff,
  createCategory,
  createMember,
  createReview,
  createVenue,
  TASHKENT,
} from './fixtures';

// Around Amir Temur square (41.311, 69.279): ~1.1 km north, ~3.7 km west, ~12 km east.
const NEAR = { lat: 41.321, lng: 69.279 };
const MID = { lat: 41.311, lng: 69.235 };
const FAR = { lat: 41.311, lng: 69.42 };

describe('rpc_nearby_venues', () => {
  test('orders by distance, filters by radius and returns distance_m', async () => {
    await runInTransaction(async (client) => {
      const category = await createCategory(client);
      const near = await createVenue(client, { categoryId: category, ...NEAR });
      const mid = await createVenue(client, { categoryId: category, ...MID });
      const far = await createVenue(client, { categoryId: category, ...FAR });

      await asAnon(client);
      const all = await client.query<{ id: string; distance_m: number; category_slug: string }>(
        `select id, distance_m, category_slug from public.rpc_nearby_venues($1, $2, 20000)
         where id in ($3, $4, $5)`,
        [TASHKENT.lat, TASHKENT.lng, near, mid, far],
      );
      expect(all.rows.map((row) => row.id)).toEqual([near, mid, far]);
      const [d1, d2, d3] = all.rows.map((row) => row.distance_m) as [number, number, number];
      expect(d1).toBeGreaterThan(900);
      expect(d1).toBeLessThan(1300);
      expect(d2).toBeGreaterThan(3300);
      expect(d2).toBeLessThan(4100);
      expect(d3).toBeGreaterThan(11000);
      expect(d3).toBeLessThan(13000);

      const within5km = await client.query<{ id: string }>(
        `select id from public.rpc_nearby_venues($1, $2, 5000) where id in ($3, $4, $5)`,
        [TASHKENT.lat, TASHKENT.lng, near, mid, far],
      );
      expect(within5km.rows.map((row) => row.id)).toEqual([near, mid]);

      const within2km = await client.query<{ id: string }>(
        `select id from public.rpc_nearby_venues($1, $2, 2000) where id in ($3, $4, $5)`,
        [TASHKENT.lat, TASHKENT.lng, near, mid, far],
      );
      expect(within2km.rows.map((row) => row.id)).toEqual([near]);
    });
  });

  test('respects RLS (draft venues hidden from anon, visible to their staff) and category filter', async () => {
    await runInTransaction(async (client) => {
      const staff = await createMember(client);
      const gym = await createCategory(client, 'Gym');
      const pool = await createCategory(client, 'Pool');
      const draft = await createVenue(client, { categoryId: gym, status: 'draft', ...NEAR });
      const poolVenue = await createVenue(client, { categoryId: pool, ...NEAR });
      await addVenueStaff(client, draft, staff.id);
      const { rows: slugs } = await client.query<{ slug: string }>(
        `select slug from public.venue_categories where id = $1`,
        [pool],
      );

      await asAnon(client);
      const anonRows = await client.query<{ id: string }>(
        `select id from public.rpc_nearby_venues($1, $2, 5000) where id in ($3, $4)`,
        [TASHKENT.lat, TASHKENT.lng, draft, poolVenue],
      );
      expect(anonRows.rows.map((row) => row.id)).toEqual([poolVenue]);

      const byCategory = await client.query<{ id: string }>(
        `select id from public.rpc_nearby_venues($1, $2, 5000, $3) where id in ($4, $5)`,
        [TASHKENT.lat, TASHKENT.lng, slugs[0]!.slug, draft, poolVenue],
      );
      expect(byCategory.rows.map((row) => row.id)).toEqual([poolVenue]);

      // Staff see their draft venue through RLS, but nearby search lists active venues only.
      await asUser(client, { sub: staff.id, roles: ['member', 'partner'] });
      const staffRows = await client.query<{ id: string }>(
        `select id from public.rpc_nearby_venues($1, $2, 5000) where id in ($3, $4)`,
        [TASHKENT.lat, TASHKENT.lng, draft, poolVenue],
      );
      expect(staffRows.rows.map((row) => row.id)).toEqual([poolVenue]);
    });
  });

  test('p_open_now keeps only venues open at the current venue-local time', async () => {
    await runInTransaction(async (client) => {
      const open = await createVenue(client, NEAR);
      const closed = await createVenue(client, NEAR);
      await client.query(
        `insert into public.venue_hours (venue_id, weekday, opens, closes)
         select $1, d, '00:00', '24:00' from generate_series(0, 6) d`,
        [open],
      );
      await asAnon(client);
      const { rows } = await client.query<{ id: string }>(
        `select id from public.rpc_nearby_venues($1, $2, 5000, null, true) where id in ($3, $4)`,
        [TASHKENT.lat, TASHKENT.lng, open, closed],
      );
      expect(rows.map((row) => row.id)).toEqual([open]);
    });
  });
});

describe('rpc_venue_is_open', () => {
  test('uses the venue timezone, weekday 0 = Sunday, and overnight hours', async () => {
    await runInTransaction(async (client) => {
      const venue = await createVenue(client, { tz: 'Asia/Tashkent' });
      // Monday 08:00-22:00, Friday 22:00-02:00 (overnight into Saturday).
      await client.query(
        `insert into public.venue_hours (venue_id, weekday, opens, closes) values
         ($1, 1, '08:00', '22:00'), ($1, 5, '22:00', '02:00')`,
        [venue],
      );
      const at = (iso: string) =>
        client
          .query<{ open: boolean }>(
            `select public.rpc_venue_is_open($1, $2::timestamptz) as open`,
            [venue, iso],
          )
          .then((r) => r.rows[0]!.open);

      // 2026-10-12 is a Monday. Tashkent is UTC+5.
      expect(await at('2026-10-12T04:00:00Z')).toBe(true); // 09:00 local Monday
      expect(await at('2026-10-12T17:30:00Z')).toBe(false); // 22:30 local Monday
      expect(await at('2026-10-12T02:30:00Z')).toBe(false); // 07:30 local Monday
      expect(await at('2026-10-13T04:00:00Z')).toBe(false); // Tuesday: no hours
      expect(await at('2026-10-16T18:00:00Z')).toBe(true); // Friday 23:00 local (overnight slot)
      expect(await at('2026-10-16T20:30:00Z')).toBe(true); // Saturday 01:30 local (same slot)
      expect(await at('2026-10-16T21:30:00Z')).toBe(false); // Saturday 02:30 local
      expect(await at('2026-10-15T20:00:00Z')).toBe(false); // Friday 01:00 local: Thursday has no slot
    });
  });
});

describe('venue rating aggregate', () => {
  test('rating_avg/rating_count follow published reviews only', async () => {
    await runInTransaction(async (client) => {
      const venue = await createVenue(client);
      const a = await createMember(client);
      const b = await createMember(client);
      const c = await createMember(client);
      const read = async () =>
        (
          await client.query<{ rating_avg: string; rating_count: number }>(
            `select rating_avg::text, rating_count from public.venues where id = $1`,
            [venue],
          )
        ).rows[0];

      const first = await createReview(client, a.id, venue, 5);
      await createReview(client, b.id, venue, 4);
      expect(await read()).toEqual({ rating_avg: '4.50', rating_count: 2 });

      await createReview(client, c.id, venue, 1, { status: 'hidden' });
      expect(await read()).toEqual({ rating_avg: '4.50', rating_count: 2 });

      await client.query(`update public.reviews set status = 'hidden' where id = $1`, [first]);
      expect(await read()).toEqual({ rating_avg: '4.00', rating_count: 1 });

      await client.query(`delete from public.reviews where venue_id = $1`, [venue]);
      expect(await read()).toEqual({ rating_avg: '0.00', rating_count: 0 });
    });
  });
});
