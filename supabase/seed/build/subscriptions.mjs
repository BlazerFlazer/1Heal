/**
 * Subscriptions (one row per 30-day billing period; a renewal is a new row and the previous one
 * becomes 'expired'), freezes, payments and saved cards. visits_used is filled in by the visit
 * simulation. `initialStatus` is what the row is inserted with; `status` is where the seed moves
 * it with an update, so the subscription/payment ledgers record a real transition.
 */
import { seedUuid } from '../lib/ids.mjs';
import { ANCHOR, DAY_MS, HOUR_MS, MINUTE_MS, dayStart, isoLocal } from '../lib/time.mjs';

const PERIOD_MS = 30 * DAY_MS;
const PROVIDERS = { payme: 0.45, click: 0.35, uzum: 0.2 };

export function buildSubscriptions(rng, people, plans) {
  const planByCode = new Map(plans.map((p) => [p.code, p]));
  const subscriptions = [];
  const freezes = [];
  const payments = [];
  const paymentMethods = [];

  const addPayment = (r, person, sub, { status, createdAt, kind }) => {
    const n = payments.length + 1;
    const provider = r.weighted(Object.keys(PROVIDERS), (p) => PROVIDERS[p]);
    const providerTxnId =
      provider === 'payme'
        ? r.hex(24)
        : provider === 'click'
          ? r.digits(10)
          : seedUuid('uzum-txn', n);
    payments.push({
      id: seedUuid('payment', n),
      userId: person.id,
      subscriptionId: sub.id,
      provider,
      providerTxnId,
      amountUzs: planByCode.get(sub.planCode).priceUzs,
      status,
      createdAt,
      paidAt: status === 'paid' ? createdAt + 2 * MINUTE_MS : null,
      failedAt: status === 'failed' ? createdAt + 2 * MINUTE_MS : null,
      idempotencyKey: `seed:payment:${n}`,
      metadata: {
        seed: true,
        kind,
        plan: sub.planCode,
        period_start: isoLocal(sub.periodStart),
      },
    });
  };

  const addSub = (person, fields) => {
    const plan = planByCode.get(fields.planCode);
    const sub = {
      id: seedUuid('subscription', person.key, fields.role),
      userId: person.id,
      personKey: person.key,
      planId: plan.id,
      autoRenew: true,
      cancelAt: null,
      frozenUntil: null,
      scheduledPlanId: null,
      visitsUsed: 0,
      changedAt: null,
      ...fields,
    };
    subscriptions.push(sub);
    return sub;
  };

  for (const person of people) {
    if (person.kind !== 'member' || person.scenario === 'none') continue;
    const r = rng.fork(`subscriptions:${person.key}`);
    const at = (offset) => dayStart(offset) + r.int(9 * 60, 22 * 60) * MINUTE_MS;

    let current = null;
    if (person.scenario === 'active' || person.scenario === 'frozen') {
      const start = at(person.startOffset);
      if (person.previous) {
        const previous = addSub(person, {
          role: 'previous',
          planCode: person.previous,
          initialStatus: 'active',
          status: 'expired',
          periodStart: start - PERIOD_MS,
          periodEnd: start,
          changedAt: start,
        });
        addPayment(r, person, previous, {
          status: 'paid',
          createdAt: previous.periodStart - 3 * MINUTE_MS,
          kind: 'subscription',
        });
      }
      current = addSub(person, {
        role: 'current',
        planCode: person.plan,
        initialStatus: 'active',
        status: 'active',
        periodStart: start,
        periodEnd: start + PERIOD_MS,
      });
      if (person.scenario === 'frozen') {
        const startsAt = dayStart(person.freezeStartOffset) + 10 * HOUR_MS;
        const endsAt = startsAt + person.freezeDays * DAY_MS;
        Object.assign(current, {
          status: 'frozen',
          frozenUntil: endsAt,
          changedAt: startsAt,
          freezeStartsAt: startsAt,
        });
        freezes.push({
          id: seedUuid('freeze', person.key),
          subscriptionId: current.id,
          startsAt,
          endsAt,
          createdBy: person.id,
          createdAt: startsAt,
        });
      }
      if (person.scheduledPlan) current.scheduledPlanId = planByCode.get(person.scheduledPlan).id;
      if (person.cancelAtPeriodEnd)
        Object.assign(current, { autoRenew: false, cancelAt: current.periodEnd });
      if (!person.featured && r.chance(0.12)) {
        addPayment(r, person, current, {
          status: 'failed',
          createdAt: start - 25 * MINUTE_MS,
          kind: 'subscription',
        });
      }
      addPayment(r, person, current, {
        status: 'paid',
        createdAt: start - 3 * MINUTE_MS,
        kind: person.previous ? 'renewal' : 'subscription',
      });
    } else if (person.scenario === 'past_due' || person.scenario === 'lapsed') {
      const start = at(person.endOffset - 30);
      const sub = addSub(person, {
        role: 'current',
        planCode: person.plan,
        initialStatus: 'active',
        status: person.scenario === 'past_due' ? 'past_due' : 'expired',
        periodStart: start,
        periodEnd: start + PERIOD_MS,
        autoRenew: person.scenario === 'past_due',
        changedAt: start + PERIOD_MS,
      });
      addPayment(r, person, sub, {
        status: 'paid',
        createdAt: start - 3 * MINUTE_MS,
        kind: 'subscription',
      });
      if (person.scenario === 'past_due') {
        addPayment(r, person, sub, {
          status: 'failed',
          createdAt: sub.periodEnd + MINUTE_MS,
          kind: 'renewal',
        });
      }
    } else if (person.scenario === 'pending') {
      if (person.previous) {
        const end = at(person.previousEndOffset);
        const previous = addSub(person, {
          role: 'previous',
          planCode: person.previous,
          initialStatus: 'active',
          status: 'expired',
          periodStart: end - PERIOD_MS,
          periodEnd: end,
          autoRenew: false,
          changedAt: end,
        });
        addPayment(r, person, previous, {
          status: 'paid',
          createdAt: previous.periodStart - 3 * MINUTE_MS,
          kind: 'subscription',
        });
      }
      const createdAt = ANCHOR - r.int(60, 20 * 60) * MINUTE_MS;
      const sub = addSub(person, {
        role: 'current',
        planCode: person.plan,
        initialStatus: 'pending_payment',
        status: 'pending_payment',
        periodStart: createdAt,
        periodEnd: createdAt + PERIOD_MS,
      });
      addPayment(r, person, sub, {
        status: 'pending',
        createdAt: createdAt + MINUTE_MS,
        kind: 'subscription',
      });
    }
    if (current) person.currentSubscriptionId = current.id;
  }

  for (const sub of subscriptions) sub.createdAt = sub.periodStart - 3 * MINUTE_MS;

  // Saved cards (tokenised by the provider; the app never sees the PAN).
  const paidByUser = new Map();
  for (const p of payments) if (p.status === 'paid') paidByUser.set(p.userId, p);
  for (const person of people) {
    const last = paidByUser.get(person.id);
    const r = rng.fork(`cards:${person.key}`);
    if (!last || !r.chance(0.6)) continue;
    const cardCount = r.chance(0.12) ? 2 : 1;
    for (let n = 1; n <= cardCount; n += 1) {
      const bin = r.chance(0.7) ? '8600' : '9860';
      paymentMethods.push({
        id: seedUuid('card', person.key, n),
        userId: person.id,
        provider: n === 1 ? last.provider : 'payme',
        providerToken: `seed_tok_${r.hex(32)}`,
        maskedPan: `${bin}${r.digits(2)}******${r.digits(4)}`,
        expiry: `${String(r.int(1, 12)).padStart(2, '0')}/${r.int(27, 31)}`,
        isDefault: n === 1,
        createdAt: last.createdAt,
      });
    }
  }

  return { subscriptions, freezes, payments, paymentMethods };
}
