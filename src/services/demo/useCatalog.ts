import { useQuery } from '@tanstack/react-query';

import { useLocale } from '@/shared/i18n';

import {
  getCategories,
  getClasses,
  getPlans,
  getReviews,
  getSessions,
  getTrainers,
  getVenue,
  searchVenues,
} from './catalog';
import type { VenueFilters } from './types';

/**
 * TanStack Query wrappers over the demo repository, so screens already have loading/error states
 * and can switch to the Supabase repository without changes (ADR-032).
 */
const LATENCY_MS = 180;
const later = <T>(value: () => T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value()), LATENCY_MS));

export function useCategories() {
  return useQuery({ queryKey: ['demo', 'categories'], queryFn: () => later(getCategories) });
}

export function usePlans() {
  return useQuery({ queryKey: ['demo', 'plans'], queryFn: () => later(getPlans) });
}

export function useVenues(filters: VenueFilters) {
  const { locale } = useLocale();
  return useQuery({
    queryKey: ['demo', 'venues', locale, filters],
    queryFn: () => later(() => searchVenues(filters, locale)),
    placeholderData: (previous) => previous,
  });
}

export function useVenueDetails(id: string) {
  return useQuery({
    queryKey: ['demo', 'venue', id],
    queryFn: () =>
      later(() => {
        const venue = getVenue(id);
        if (!venue) throw new Error(`Venue ${id} not found`);
        return {
          venue,
          trainers: getTrainers(venue.id),
          classes: getClasses(venue.id),
          reviews: getReviews(venue.id),
        };
      }),
  });
}

export function useSessions(venueId: string, day: Date) {
  return useQuery({
    queryKey: ['demo', 'sessions', venueId, day.toDateString()],
    queryFn: () => later(() => getSessions(venueId, day)),
  });
}
