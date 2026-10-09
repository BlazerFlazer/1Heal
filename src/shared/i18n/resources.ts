import authEn from './locales/en/auth.json';
import bookingEn from './locales/en/booking.json';
import bookingsEn from './locales/en/bookings.json';
import commonEn from './locales/en/common.json';
import discoverEn from './locales/en/discover.json';
import errorsEn from './locales/en/errors.json';
import homeEn from './locales/en/home.json';
import legalEn from './locales/en/legal.json';
import onboardingEn from './locales/en/onboarding.json';
import partnerEn from './locales/en/partner.json';
import profileEn from './locales/en/profile.json';
import qrEn from './locales/en/qr.json';
import reviewsEn from './locales/en/reviews.json';
import settingsEn from './locales/en/settings.json';
import subscriptionEn from './locales/en/subscription.json';
import tabsEn from './locales/en/tabs.json';
import uiEn from './locales/en/ui.json';
import venueEn from './locales/en/venue.json';
import authRu from './locales/ru/auth.json';
import bookingRu from './locales/ru/booking.json';
import bookingsRu from './locales/ru/bookings.json';
import commonRu from './locales/ru/common.json';
import discoverRu from './locales/ru/discover.json';
import errorsRu from './locales/ru/errors.json';
import homeRu from './locales/ru/home.json';
import legalRu from './locales/ru/legal.json';
import onboardingRu from './locales/ru/onboarding.json';
import partnerRu from './locales/ru/partner.json';
import profileRu from './locales/ru/profile.json';
import qrRu from './locales/ru/qr.json';
import reviewsRu from './locales/ru/reviews.json';
import settingsRu from './locales/ru/settings.json';
import subscriptionRu from './locales/ru/subscription.json';
import tabsRu from './locales/ru/tabs.json';
import uiRu from './locales/ru/ui.json';
import venueRu from './locales/ru/venue.json';
import authUz from './locales/uz/auth.json';
import bookingUz from './locales/uz/booking.json';
import bookingsUz from './locales/uz/bookings.json';
import commonUz from './locales/uz/common.json';
import discoverUz from './locales/uz/discover.json';
import errorsUz from './locales/uz/errors.json';
import homeUz from './locales/uz/home.json';
import legalUz from './locales/uz/legal.json';
import onboardingUz from './locales/uz/onboarding.json';
import partnerUz from './locales/uz/partner.json';
import profileUz from './locales/uz/profile.json';
import qrUz from './locales/uz/qr.json';
import reviewsUz from './locales/uz/reviews.json';
import settingsUz from './locales/uz/settings.json';
import subscriptionUz from './locales/uz/subscription.json';
import tabsUz from './locales/uz/tabs.json';
import uiUz from './locales/uz/ui.json';
import venueUz from './locales/uz/venue.json';
import type { Locale } from './types';

/**
 * Top-level sections of the single `translation` namespace. Each section is one
 * file in `locales/<lng>/<section>.json`; keys are addressed as `section.path.to.key`.
 */
export const NAMESPACES = [
  'common',
  'ui',
  'errors',
  'tabs',
  'auth',
  'onboarding',
  'legal',
  'home',
  'discover',
  'bookings',
  'qr',
  'profile',
  'partner',
  'subscription',
  'venue',
  'booking',
  'reviews',
  'settings',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

/** Every section must exist for every language; the compiler enforces it here. */
type TranslationBundle = Record<Namespace, Record<string, unknown>>;

const ru = {
  common: commonRu,
  ui: uiRu,
  errors: errorsRu,
  tabs: tabsRu,
  auth: authRu,
  onboarding: onboardingRu,
  legal: legalRu,
  home: homeRu,
  discover: discoverRu,
  bookings: bookingsRu,
  qr: qrRu,
  profile: profileRu,
  partner: partnerRu,
  subscription: subscriptionRu,
  venue: venueRu,
  booking: bookingRu,
  reviews: reviewsRu,
  settings: settingsRu,
} satisfies TranslationBundle;

const uz = {
  common: commonUz,
  ui: uiUz,
  errors: errorsUz,
  tabs: tabsUz,
  auth: authUz,
  onboarding: onboardingUz,
  legal: legalUz,
  home: homeUz,
  discover: discoverUz,
  bookings: bookingsUz,
  qr: qrUz,
  profile: profileUz,
  partner: partnerUz,
  subscription: subscriptionUz,
  venue: venueUz,
  booking: bookingUz,
  reviews: reviewsUz,
  settings: settingsUz,
} satisfies TranslationBundle;

const en = {
  common: commonEn,
  ui: uiEn,
  errors: errorsEn,
  tabs: tabsEn,
  auth: authEn,
  onboarding: onboardingEn,
  legal: legalEn,
  home: homeEn,
  discover: discoverEn,
  bookings: bookingsEn,
  qr: qrEn,
  profile: profileEn,
  partner: partnerEn,
  subscription: subscriptionEn,
  venue: venueEn,
  booking: bookingEn,
  reviews: reviewsEn,
  settings: settingsEn,
} satisfies TranslationBundle;

/** i18next resources: one `translation` namespace per language. */
export const resources = {
  ru: { translation: ru },
  uz: { translation: uz },
  en: { translation: en },
} satisfies Record<Locale, { translation: TranslationBundle }>;

export type Resources = typeof resources;
