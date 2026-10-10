/**
 * Visit simulation: bookings, visits, QR tokens, check-in attempts and penalties over the last 60
 * days plus upcoming bookings for the next week. Every booking goes through `book()`, which
 * enforces the server rules the app will rely on: venue tier <= plan tier, visits + no-shows +
 * upcoming bookings <= visits_per_month, visits per venue <= per_venue_monthly_cap, one booking per
 * member per day, class capacity, cancellation window, subscription period and freezes.
 */
import { categoryBySlug } from '../data/categories.mjs';
import { CANCEL_REASONS, MANUAL_REASONS } from '../data/texts.mjs';
import { seedUuid } from '../lib/ids.mjs';
import { ANCHOR, DAY_MS, MINUTE_MS } from '../lib/time.mjs';
import { pickDropIn } from './habits.mjs';

const SECOND_MS = 1000;
/** Bookings not checked in are marked no_show this long after ends_at (cron, M5). */
export const NO_SHOW_MARK_MS = 15 * MINUTE_MS;

export function createBookingEngine(rng, { catalog, staffByVenue }) {
  const planById = new Map(catalog.plans.map((p) => [p.id, p]));
  const sessionsByVenueDay = new Map();
  for (const s of catalog.sessions) {
    const key = `${s.venueId}:${s.day}`;
    sessionsByVenueDay.set(key, [...(sessionsByVenueDay.get(key) ?? []), s]);
  }
  const out = { bookings: [], visits: [], qrTokens: [], attempts: [] };
  const memberDays = new Map();
  const memberSessions = new Map();
  const noShows = new Map();
  const counters = new Map();

  const counter = (sub) => {
    if (!counters.has(sub.id))
      counters.set(sub.id, {
        consumed: 0,
        upcoming: 0,
        visitsAt: new Map(),
        upcomingAt: new Map(),
      });
    return counters.get(sub.id);
  };
  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

  function openSessions(venue, d, userId, wantFull) {
    return (sessionsByVenueDay.get(`${venue.id}:${d}`) ?? []).filter(
      (s) =>
        s.status !== 'cancelled' &&
        !memberSessions.get(userId)?.has(s.id) &&
        (wantFull ? s.bookedCount >= s.capacity : s.bookedCount < s.capacity),
    );
  }

  function recordVisit(r, { person, sub, venue, booking, startsAt, isClass }) {
    const n = out.visits.length + 1;
    const offset = isClass ? -r.int(1, 15) : r.int(-10, 12);
    const checkedInAt = Math.max(startsAt + offset * MINUTE_MS, sub.periodStart + MINUTE_MS);
    const staff = staffByVenue.get(venue.id) ?? [];
    const staffUserId = staff.length > 0 ? r.pick(staff) : null;
    const manual = staff.length > 0 && r.chance(0.1);
    const qrJti = manual ? null : seedUuid('qr', n);
    if (qrJti) {
      const issuedAt = checkedInAt - r.int(3, 40) * SECOND_MS;
      out.qrTokens.push({
        jti: qrJti,
        userId: person.id,
        deviceId: person.device.id,
        issuedAt,
        expiresAt: issuedAt + 45 * SECOND_MS,
        usedAt: checkedInAt,
        usedVenueId: venue.id,
      });
      if (r.chance(0.05)) {
        out.attempts.push({
          id: seedUuid('attempt-stale', n),
          venueId: venue.id,
          staffUserId,
          userId: person.id,
          jti: seedUuid('qr-stale', n),
          resultCode: 'TOKEN_EXPIRED',
          bookingId: booking?.id ?? null,
          createdAt: checkedInAt - r.int(20, 90) * SECOND_MS,
        });
      }
    }
    out.visits.push({
      id: seedUuid('visit', n),
      userId: person.id,
      venueId: venue.id,
      bookingId: booking?.id ?? null,
      subscriptionId: sub.id,
      checkedInAt,
      method: manual ? 'manual' : 'qr',
      staffUserId,
      manualReason: manual ? r.pick(MANUAL_REASONS) : null,
      qrJti,
    });
    out.attempts.push({
      id: seedUuid('attempt', n),
      venueId: venue.id,
      staffUserId,
      userId: person.id,
      jti: qrJti,
      resultCode: 'OK',
      bookingId: booking?.id ?? null,
      createdAt: checkedInAt,
    });
  }

  /**
   * outcome: checked_in | walk_in (visit without booking) | no_show | cancelled | confirmed |
   * waitlisted. `forced` (scripted stories) throws instead of returning null.
   */
  function book(
    r,
    { person, sub, venue, d, outcome, preferClass = false, time, session, forced = false },
  ) {
    const fail = (why) => {
      if (forced)
        throw new Error(
          `scripted booking failed (${why}): ${person.key} ${venue.slug} day ${d} ${outcome}`,
        );
      return null;
    };
    const plan = planById.get(sub.planId);
    if (venue.status !== 'active') return fail('venue not active');
    if (venue.tier > plan.maxVenueTier) return fail('tier');
    const days = memberDays.get(person.id) ?? new Set();
    if (days.has(d)) return fail('day taken');
    const c = counter(sub);
    const consumes = ['checked_in', 'walk_in', 'no_show'].includes(outcome);
    const takesVenueSlot = ['checked_in', 'walk_in', 'confirmed'].includes(outcome);
    if ((consumes || outcome === 'confirmed') && c.consumed + c.upcoming >= plan.visitsPerMonth)
      return fail('quota');
    const atVenue = (c.visitsAt.get(venue.id) ?? 0) + (c.upcomingAt.get(venue.id) ?? 0);
    if (takesVenueSlot && atVenue >= plan.perVenueMonthlyCap) return fail('venue cap');

    let chosen = session ?? null;
    if (!chosen && outcome !== 'walk_in' && !time) {
      const share = preferClass ? 1 : categoryBySlug(venue.category).classShare;
      const options = r.chance(share)
        ? openSessions(venue, d, person.id, outcome === 'waitlisted')
        : [];
      if (options.length > 0) chosen = r.pick(options);
    }
    if (outcome === 'waitlisted' && !chosen) return fail('no full session');
    let slot;
    if (chosen) {
      const full = chosen.bookedCount >= chosen.capacity;
      if (chosen.status === 'cancelled' || (outcome === 'waitlisted' ? !full : full))
        return fail('capacity');
      if (memberSessions.get(person.id)?.has(chosen.id)) return fail('session already booked');
      slot = { startsAt: chosen.startsAt, endsAt: chosen.endsAt };
    } else {
      slot = pickDropIn(r, venue, d, person.gender, time);
      if (!slot) return fail('closed');
    }
    const { startsAt, endsAt } = slot;
    const upcoming = outcome === 'confirmed' || outcome === 'waitlisted';
    if (upcoming ? startsAt < ANCHOR : endsAt > ANCHOR) return fail('outside window');
    if (startsAt < sub.periodStart + 60 * MINUTE_MS || startsAt >= sub.periodEnd)
      return fail('outside period');
    if (sub.freezeStartsAt && endsAt > sub.freezeStartsAt) return fail('frozen');

    const earliest = sub.periodStart + 5 * MINUTE_MS;
    let createdAt;
    let cancelledAt = null;
    if (outcome === 'cancelled') {
      const latest = startsAt - (venue.cancellationWindowMin + 10) * MINUTE_MS;
      createdAt = Math.max(earliest, latest - r.int(3 * 60, 72 * 60) * MINUTE_MS);
      if (createdAt + 10 * MINUTE_MS > latest) return fail('no room to cancel for free');
      cancelledAt = createdAt + r.int(10, Math.floor((latest - createdAt) / MINUTE_MS)) * MINUTE_MS;
    } else if (upcoming) {
      createdAt = Math.max(
        earliest,
        Math.min(ANCHOR - r.int(60, 72 * 60) * MINUTE_MS, startsAt - 60 * MINUTE_MS),
      );
    } else {
      createdAt = Math.max(earliest, startsAt - r.int(2 * 60, 48 * 60) * MINUTE_MS);
    }
    if (createdAt >= startsAt) return fail('created after start');

    days.add(d);
    memberDays.set(person.id, days);
    let booking = null;
    if (outcome !== 'walk_in') {
      const n = out.bookings.length + 1;
      booking = {
        id: seedUuid('booking', n),
        idempotencyKey: `seed:booking:${n}`,
        userId: person.id,
        venueId: venue.id,
        subscriptionId: sub.id,
        classSessionId: chosen?.id ?? null,
        startsAt,
        endsAt,
        initialStatus: outcome === 'waitlisted' ? 'waitlisted' : 'confirmed',
        status: outcome,
        waitlistPosition: null,
        createdAt,
        cancelledAt,
        cancelReason: cancelledAt && r.chance(0.5) ? r.pick(CANCEL_REASONS[person.locale]) : null,
      };
      out.bookings.push(booking);
    }
    if (chosen) {
      memberSessions.set(person.id, (memberSessions.get(person.id) ?? new Set()).add(chosen.id));
      if (outcome === 'waitlisted') booking.waitlistPosition = ++chosen.waitlistCount;
      else if (outcome !== 'cancelled') chosen.bookedCount += 1;
    }
    if (consumes) c.consumed += 1;
    if (outcome === 'confirmed') {
      c.upcoming += 1;
      bump(c.upcomingAt, venue.id);
    }
    if (outcome === 'no_show') noShows.set(person.id, [...(noShows.get(person.id) ?? []), booking]);
    if (outcome === 'checked_in' || outcome === 'walk_in') {
      bump(c.visitsAt, venue.id);
      recordVisit(r, { person, sub, venue, booking, startsAt, isClass: Boolean(chosen) });
    }
    return booking ?? out.visits.at(-1);
  }

  /** No-shows of a member in the 30 days before `ms`. */
  const recentNoShows = (person, ms) =>
    (noShows.get(person.id) ?? []).filter((b) => b.startsAt <= ms && ms - b.startsAt < 30 * DAY_MS);

  /** 3 no-shows within 30 days -> a 7-day booking block (docs/PLAN.md section 3). */
  function penalties() {
    const rows = [];
    for (const [userId, list] of noShows) {
      const sorted = [...list].sort((a, b) => a.startsAt - b.startsAt);
      for (let i = 2; i < sorted.length; i += 1) {
        if (sorted[i].startsAt - sorted[i - 2].startsAt >= 30 * DAY_MS) continue;
        const startsAt = sorted[i].endsAt + NO_SHOW_MARK_MS;
        rows.push({
          id: seedUuid('penalty', userId, i),
          userId,
          kind: 'no_show_block',
          startsAt,
          endsAt: startsAt + 7 * DAY_MS,
          sourceBookingIds: sorted.slice(i - 2, i + 1).map((b) => b.id),
          createdAt: startsAt,
        });
        break;
      }
    }
    return rows;
  }

  const sessionAt = (venue, d, time) =>
    (sessionsByVenueDay.get(`${venue.id}:${d}`) ?? []).find((s) => s.time === time);

  return { out, book, counter, recentNoShows, penalties, sessionAt };
}
