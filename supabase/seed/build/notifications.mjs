/**
 * In-app notifications derived from the simulated activity, rendered from the templates in
 * data/texts.mjs in all three languages: the latest check-in and a review request per active
 * member, renewal reminders for periods ending within a week, the penalty and waitlist notices of
 * the featured stories.
 */
import { NOTIFICATIONS, fillTemplate } from '../data/texts.mjs';
import { seedUuid } from '../lib/ids.mjs';
import { ANCHOR, DAY_MS, HOUR_MS, MINUTE_MS, dayMonth } from '../lib/time.mjs';

export function buildNotifications(r, ctx) {
  const { people, venues, plans, subscriptions, visits, reviews, penalties, bookings } = ctx;
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const planById = new Map(plans.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const reviewed = new Set(reviews.map((rv) => rv.visitId));
  const rows = [];
  const add = (person, kind, { values, data, at, read = false }) => {
    const template = NOTIFICATIONS[kind];
    rows.push({
      id: seedUuid('notification', person.key, kind),
      userId: person.id,
      kind,
      title: fillTemplate(template.title, values),
      body: fillTemplate(template.body, values),
      data,
      sentAt: at,
      readAt: read ? at + r.int(5, 240) * MINUTE_MS : null,
      createdAt: at,
    });
  };

  for (const person of people) {
    const sub = subscriptions.find(
      (s) => s.id === person.currentSubscriptionId && s.status === 'active',
    );
    if (!sub) continue;
    const plan = planById.get(sub.planId);
    const last = visits.filter((v) => v.subscriptionId === sub.id).at(-1);
    if (last) {
      const venue = venueById.get(last.venueId);
      const data = { visit_id: last.id, venue_id: venue.id };
      add(person, 'visit_checked_in', {
        values: { venue: venue.name, left: plan.visitsPerMonth - sub.visitsUsed },
        data,
        at: last.checkedInAt + MINUTE_MS,
        read: ANCHOR - last.checkedInAt > 2 * DAY_MS,
      });
      if (!reviewed.has(last.id)) {
        add(person, 'review_request', {
          values: { venue: venue.name },
          data,
          at: last.checkedInAt + 3 * HOUR_MS,
        });
      }
    }
    if (sub.autoRenew && sub.periodEnd - ANCHOR < 7 * DAY_MS) {
      add(person, 'subscription_renewal', {
        values: { plan: plan.name, date: dayMonth(sub.periodEnd) },
        data: { subscription_id: sub.id },
        at: Math.min(sub.periodEnd - 3 * DAY_MS, ANCHOR - 2 * HOUR_MS),
      });
    }
  }

  for (const penalty of penalties) {
    add(personById.get(penalty.userId), 'penalty_applied', {
      values: { date: dayMonth(penalty.endsAt) },
      data: { penalty_id: penalty.id },
      at: penalty.startsAt,
      read: true,
    });
  }

  const sessionById = new Map(ctx.sessions.map((s) => [s.id, s]));
  const templateById = new Map(ctx.templates.map((t) => [t.id, t]));
  for (const booking of bookings.filter((b) => b.status === 'waitlisted')) {
    const person = personById.get(booking.userId);
    if (!person.featured) continue;
    const template = templateById.get(sessionById.get(booking.classSessionId).templateId);
    add(person, 'waitlist_joined', {
      values: {
        class: template.name,
        venue: venueById.get(booking.venueId).name,
        position: booking.waitlistPosition,
      },
      data: { booking_id: booking.id },
      at: booking.createdAt,
    });
  }
  return rows;
}
