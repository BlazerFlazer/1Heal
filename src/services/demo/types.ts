/**
 * Catalog types for the demo data mode (ADR-032). They mirror the Postgres schema in
 * supabase/migrations so the demo repository can later be swapped for a Supabase one.
 */
export type Locale = 'ru' | 'uz' | 'en';
export type I18nText = Record<Locale, string>;

export type PlanCode = 'basic' | 'standard' | 'premium';

export type Plan = {
  id: string;
  code: PlanCode;
  sort: number;
  priceUzs: number;
  visitsPerMonth: number;
  maxVenueTier: number;
  perVenueMonthlyCap: number;
  name: I18nText;
  perks: ({ key: string } & I18nText)[];
};

export type Category = {
  id: string;
  slug: string;
  /** lucide icon name, kebab-case (e.g. "dumbbell"). */
  icon: string;
  name: I18nText;
  sort: number;
};

export type OpeningSlot = { opens: string; closes: string; womenOnly: boolean };

export type Venue = {
  id: string;
  slug: string;
  /** Category slug. */
  category: string;
  /** 1..3; a plan grants access up to its maxVenueTier. */
  tier: number;
  priceTier: number;
  district: string;
  lat: number;
  lng: number;
  name: I18nText;
  street: I18nText;
  address: I18nText;
  description: I18nText;
  amenities: string[];
  phone: string;
  cancellationWindowMin: number;
  /** Keyed by JS weekday ("0" = Sunday). */
  hours: Record<string, OpeningSlot[]>;
  photos: string[];
  rating: number;
  ratingCount: number;
  popularity: number;
};

export type Trainer = {
  id: string;
  venueId: string;
  name: string;
  bio: I18nText;
  specialties: string[];
};

export type ClassTemplate = {
  id: string;
  venueId: string;
  key: string;
  name: I18nText;
  description: I18nText;
  durationMin: number;
  capacity: number;
  level: string;
  trainerId: string | null;
  /** Weekly slots: [JS weekday, "HH:MM"]. */
  slots: [number, string][];
};

export type Review = {
  id: string;
  venueId: string;
  rating: number;
  text: string;
  author: string;
  createdAt: number;
};

/** A concrete class occurrence, generated from a template's weekly slots. */
export type ClassSession = {
  /** `${classId}@${startsAt}` — stable, used as the booking key. */
  id: string;
  classId: string;
  venueId: string;
  name: I18nText;
  trainerId: string | null;
  startsAt: number;
  endsAt: number;
  capacity: number;
  /** Spots already taken by other members (deterministic demo value). */
  takenByOthers: number;
};

export type VenueSort = 'recommended' | 'distance' | 'rating';

export type VenueFilters = {
  query?: string;
  category?: string | null;
  openNow?: boolean;
  /** Only venues included in this plan tier (null = all). */
  maxTier?: number | null;
  sort?: VenueSort;
};

export type VenueListItem = Venue & { distanceKm: number; openNow: boolean };
