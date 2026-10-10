import { useTranslation } from 'react-i18next';

import { getCategory, text } from '@/services/demo/catalog';
import type { Locale, Venue } from '@/services/demo/types';
import { useLocale } from '@/shared/i18n';

/** "850 м" under a kilometre, otherwise one decimal with the locale's separator ("1,2 км"). */
export function formatDistance(
  km: number,
  locale: Locale,
  t: (key: string, options: { value: string }) => string,
): string {
  if (km < 1) {
    const metres = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return t('venue.distance.m', { value: String(metres) });
  }
  const fixed = km >= 10 ? String(Math.round(km)) : km.toFixed(1);
  const value = locale === 'en' ? fixed : fixed.replace('.', ',');
  return t('venue.distance.km', { value });
}

/** "4.9" / "4,9" — one decimal, locale separator. */
export function formatRating(value: number, locale: Locale): string {
  const fixed = value.toFixed(1);
  return locale === 'en' ? fixed : fixed.replace('.', ',');
}

export type VenueMeta = {
  name: string;
  categoryName: string;
  categoryIcon: string;
  district: string;
  tierLabel: string;
  rating: string;
};

/** Localized display strings shared by every venue surface (cards, venue page, booking sheet). */
export function useVenueMeta(venue: Venue): VenueMeta {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const category = getCategory(venue.category);
  return {
    name: text(venue.name, locale),
    categoryName: category ? text(category.name, locale) : '',
    categoryIcon: category?.icon ?? '',
    district: t(`venue.district.${venue.district}`, { defaultValue: venue.district }),
    tierLabel: t(`venue.tier.badge.${venue.tier}`),
    rating: formatRating(venue.rating, locale),
  };
}
