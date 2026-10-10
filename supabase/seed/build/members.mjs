/**
 * People: 100 demo members (8 featured with fixed phones, 92 generated), 5 partner staff and one
 * admin. Each person gets a scenario (what their subscription history looks like), profile
 * details, a device, consents and notification preferences.
 */
import { ADMIN, DEVICE_NAMES, FEATURED, STAFF, randomPerson } from '../data/people.mjs';
import { DISTRICT_KEYS } from '../data/places.mjs';
import { LEGAL_VERSION } from '../data/platform.mjs';
import { seedUuid } from '../lib/ids.mjs';
import { HOUR_MS, MINUTE_MS, dayStart } from '../lib/time.mjs';

/** Scenarios of the 92 generated members; with the featured ones: 20 active per plan. */
const RANDOM_SCENARIOS = [
  ['active:basic', 18],
  ['active:standard', 19],
  ['active:premium', 18],
  ['frozen', 2],
  ['past_due', 3],
  ['pending', 3],
  ['lapsed', 8],
  ['none', 21],
];

const LOWER_PLAN = { standard: 'basic', premium: 'standard' };

function scenarioDetails(r, scenario, plan) {
  const anyPlan = () =>
    r.weighted(['basic', 'standard', 'premium'], (p) => ({ basic: 3, standard: 4, premium: 2 })[p]);
  switch (scenario) {
    case 'active': {
      const previous = r.chance(0.75)
        ? LOWER_PLAN[plan] && r.chance(0.2)
          ? LOWER_PLAN[plan]
          : plan
        : null;
      return { plan, startOffset: -r.int(1, 28), previous };
    }
    case 'frozen':
      return {
        plan: anyPlan(),
        startOffset: -r.int(14, 24),
        freezeStartOffset: -r.int(2, 8),
        freezeDays: r.pick([10, 14, 21]),
      };
    case 'past_due':
      return { plan: anyPlan(), endOffset: -r.int(1, 5) };
    case 'pending': {
      const pendingPlan = anyPlan();
      return r.chance(0.5)
        ? { plan: pendingPlan, previous: pendingPlan, previousEndOffset: -r.int(3, 20) }
        : { plan: pendingPlan };
    }
    case 'lapsed':
      return { plan: anyPlan(), endOffset: -r.int(5, 25) };
    default:
      return { signupOffset: -r.int(1, 120) };
  }
}

/** First day (offset) of the person's oldest seeded subscription, or null. */
function firstSubscriptionDay(p) {
  if (p.scenario === 'active' || p.scenario === 'frozen')
    return p.startOffset - (p.previous ? 30 : 0);
  if (p.scenario === 'past_due' || p.scenario === 'lapsed') return p.endOffset - 30;
  if (p.scenario === 'pending') return p.previous ? p.previousEndOffset - 30 : -1;
  return null;
}

function complete(p, r) {
  const first = firstSubscriptionDay(p);
  const signupOffset = p.signupOffset ?? (first === null ? -r.int(1, 120) : first - r.int(0, 45));
  const signupAt = dayStart(signupOffset) + r.int(8 * 60, 23 * 60) * MINUTE_MS;
  const platform = r.chance(0.4) ? 'ios' : 'android';
  const age = r.int(19, 55);
  return {
    ...p,
    id: seedUuid('user', p.key),
    district: p.district ?? r.pick(DISTRICT_KEYS),
    signupAt,
    birthDate: `${2026 - age}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`,
    theme: r.weighted(['system', 'dark', 'light'], (t) => ({ system: 7, dark: 2, light: 1 })[t]),
    marketing: r.chance(0.35),
    reminders: r.chance(0.9),
    quietHours: r.chance(0.2) ? { from: '22:00', to: '08:00' } : null,
    device: {
      id: seedUuid('device', p.key),
      userId: seedUuid('user', p.key),
      platform,
      deviceName: r.pick(DEVICE_NAMES[platform]),
      appVersion: r.chance(0.7) ? '1.0.1' : '1.0.0',
      createdAt: signupAt + 2 * MINUTE_MS,
      lastSeenAt: dayStart(0) - r.int(1, 72) * HOUR_MS,
    },
  };
}

export function buildPeople(rng) {
  const r = rng.fork('people');
  const people = FEATURED.map((f) =>
    complete({ ...f, kind: 'member', featured: true }, r.fork(f.key)),
  );

  // Fixed demo phones plus the number the SMS/auth test suites use (+998 90 123 45 67).
  const usedPhones = new Set([...FEATURED, ...STAFF, ADMIN].map((p) => p.phone));
  usedPhones.add('+998901234567');
  const slots = r.shuffle(RANDOM_SCENARIOS.flatMap(([slot, count]) => Array(count).fill(slot)));
  slots.forEach((slot, index) => {
    const key = `m${String(index + 9).padStart(3, '0')}`;
    const pr = r.fork(key);
    const person = randomPerson(pr);
    let phone;
    do phone = `+99890${pr.digits(7)}`;
    while (usedPhones.has(phone) || phone.endsWith('00') || phone.startsWith('+998901000'));
    usedPhones.add(phone);
    const [scenario, plan] = slot.split(':');
    people.push(
      complete(
        {
          key,
          phone,
          ...person,
          kind: 'member',
          featured: false,
          scenario,
          ...scenarioDetails(pr, scenario, plan),
        },
        pr,
      ),
    );
  });

  for (const s of STAFF) {
    people.push(
      complete(
        { ...s, kind: 'staff', scenario: 'none', signupOffset: -r.int(150, 200) },
        r.fork(s.key),
      ),
    );
  }
  people.push(
    complete({ ...ADMIN, kind: 'admin', scenario: 'none', signupOffset: -220 }, r.fork(ADMIN.key)),
  );

  // A few active members turned auto-renew off: the subscription ends at period_end.
  const cancelling = r.sample(
    people.filter((p) => p.kind === 'member' && !p.featured && p.scenario === 'active'),
    3,
  );
  for (const p of cancelling) p.cancelAtPeriodEnd = true;
  return people;
}

/** Consents given at sign-up: terms + privacy always, marketing when opted in. */
export function buildConsents(people) {
  return people.flatMap((p) =>
    [
      ['terms', true],
      ['privacy', true],
      ['marketing', p.marketing],
    ].map(([kind, granted]) => ({
      id: seedUuid('consent', p.key, kind),
      userId: p.id,
      kind,
      version: LEGAL_VERSION,
      granted,
      at: p.signupAt + MINUTE_MS,
    })),
  );
}
