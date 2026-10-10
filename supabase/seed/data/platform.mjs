/**
 * Plans and feature flags.
 *
 * Plan names stay Latin in every language (docs/COPY.md). `perks` is an array of
 * { key, ru, uz, en } so the plans screen can render perk[locale] directly.
 * Premium "unlimited" is stored as visits_per_month = per_venue_monthly_cap = 99 (fair-use cap).
 *
 * feature_flags.key must match ^[a-z0-9_]+$, so the app's dotted/camelCase keys
 * (src/shared/config/featureFlags.ts) are snake_case here; payload.app_key names the app flag and
 * payload.value is the value to merge, so a remote provider maps rows without a lookup table.
 */
// prettier-ignore
export const PLANS = [
  {
    code: 'basic', sort: 1, priceUzs: 199_000, visitsPerMonth: 8, maxVenueTier: 1, perVenueMonthlyCap: 4,
    name: { ru: 'Basic', uz: 'Basic', en: 'Basic' },
    perks: [
      { key: 'visits', ru: '8 посещений в месяц', uz: 'Oyiga 8 ta tashrif', en: '8 visits a month' },
      { key: 'venues', ru: 'Залы, бассейны и студии базового уровня', uz: 'Boshlangʻich darajadagi zallar, basseynlar va studiyalar', en: 'Entry-level gyms, pools and studios' },
      { key: 'venue_cap', ru: 'До 4 посещений одного заведения в месяц', uz: 'Bitta maskanga oyiga 4 tagacha tashrif', en: 'Up to 4 visits a month at any one venue' },
      { key: 'freeze', ru: 'Заморозка до 30 дней раз в квартал', uz: 'Har chorakda bir marta 30 kungacha muzlatish', en: 'Freeze for up to 30 days once a quarter' },
    ],
  },
  {
    code: 'standard', sort: 2, priceUzs: 349_000, visitsPerMonth: 16, maxVenueTier: 2, perVenueMonthlyCap: 8,
    name: { ru: 'Standard', uz: 'Standard', en: 'Standard' },
    perks: [
      { key: 'visits', ru: '16 посещений в месяц', uz: 'Oyiga 16 ta tashrif', en: '16 visits a month' },
      { key: 'venues', ru: 'Всё из Basic, а также фитнес-клубы и спа среднего уровня', uz: 'Basicdagi barcha maskanlar hamda oʻrta darajadagi fitnes-klublar va spa', en: 'Everything in Basic plus mid-range clubs and spas' },
      { key: 'venue_cap', ru: 'До 8 посещений одного заведения в месяц', uz: 'Bitta maskanga oyiga 8 tagacha tashrif', en: 'Up to 8 visits a month at any one venue' },
      { key: 'freeze', ru: 'Заморозка до 30 дней раз в квартал', uz: 'Har chorakda bir marta 30 kungacha muzlatish', en: 'Freeze for up to 30 days once a quarter' },
    ],
  },
  {
    code: 'premium', sort: 3, priceUzs: 599_000, visitsPerMonth: 99, maxVenueTier: 3, perVenueMonthlyCap: 99,
    name: { ru: 'Premium', uz: 'Premium', en: 'Premium' },
    perks: [
      { key: 'visits', ru: 'Посещения без ограничений', uz: 'Cheklovsiz tashriflar', en: 'Unlimited visits' },
      { key: 'venues', ru: 'Все заведения, включая премиальные клубы и спа', uz: 'Barcha maskanlar, jumladan premium klublar va spa', en: 'Every venue, including premium clubs and spas' },
      { key: 'venue_cap', ru: 'Без лимита на одно заведение', uz: 'Bitta maskan uchun cheklov yoʻq', en: 'No per-venue limit' },
      { key: 'freeze', ru: 'Заморозка до 30 дней раз в квартал', uz: 'Har chorakda bir marta 30 kungacha muzlatish', en: 'Freeze for up to 30 days once a quarter' },
    ],
  },
];

// prettier-ignore
export const FEATURE_FLAGS = [
  { key: 'payments_payme', enabled: false, payload: { app_key: 'payments.payme', value: false }, description: 'Payme checkout. Off until the sandbox adapter and merchant contract exist (M4).' },
  { key: 'payments_click', enabled: false, payload: { app_key: 'payments.click', value: false }, description: 'Click checkout. Off until the sandbox adapter and merchant contract exist (M4).' },
  { key: 'payments_uzum', enabled: false, payload: { app_key: 'payments.uzum', value: false }, description: 'Uzum checkout. Off until the sandbox adapter and merchant contract exist (M4).' },
  { key: 'partner_mode', enabled: true, payload: { app_key: 'partnerMode', value: true }, description: 'Partner (venue staff) mode in the member app.' },
  { key: 'waitlist', enabled: true, payload: { app_key: 'waitlist', value: true }, description: 'Waitlist for full class sessions.' },
  { key: 'freeze', enabled: true, payload: { app_key: 'freeze', value: true, max_days: 30, per_quarter: 1 }, description: 'Subscription freeze: at most once per quarter, up to 30 days.' },
  { key: 'new_user_promo', enabled: false, payload: { app_key: 'newUserPromo', value: false }, description: 'Promo banner for members without a subscription.' },
  { key: 'maps_provider', enabled: true, payload: { app_key: 'maps.provider', value: 'yandex' }, description: 'Map SDK used by Discover (ADR-009).' },
  { key: 'no_show_penalty', enabled: true, payload: { threshold: 3, window_days: 30, block_days: 7 }, description: 'No-show rule from docs/PLAN.md section 3: N no-shows in the window block booking.' },
];

/** Per-visit payout rate by venue tier, integer UZS (illustrative figures for demo payouts). */
export const PAYOUT_RATE_UZS = { 1: 15_000, 2: 25_000, 3: 45_000 };

/** Version string recorded in consents for the terms and privacy policy accepted at sign-up. */
export const LEGAL_VERSION = '2026-04-01';
