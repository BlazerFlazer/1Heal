import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { checkBooking, type BookingRequest } from '@/domain/membership';
import type { Venue } from '@/services/demo/types';
import { useMembership } from '@/services/membership/useMembership';
import { haptics } from '@/shared/theme/haptics';
import { useToast } from '@/shared/ui/Toast';

import type { BookingPhase, BookingTarget } from './types';

export type BookingFlow = {
  target: BookingTarget | null;
  phase: BookingPhase;
  open: (target: BookingTarget) => void;
  close: () => void;
  confirm: () => void;
};

function requestFor(venue: Venue, target: BookingTarget): BookingRequest {
  return {
    venueId: venue.id,
    venueTier: venue.tier,
    sessionId: target.sessionId,
    startsAt: target.startsAt,
    spotsLeft: target.spotsLeft,
  };
}

/**
 * Booking sheet state for one venue. Opening runs the same rules as the ledger as a preview, so a
 * member without access sees why straight away; confirming books through the membership store,
 * which re-checks everything (the authoritative rule set, CLAUDE.md "never trust the client").
 */
export function useBookingFlow(venue: Venue | undefined): BookingFlow {
  const { t } = useTranslation();
  const toast = useToast();
  const membership = useMembership();
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [phase, setPhase] = useState<BookingPhase>({ step: 'confirm' });

  const open = (next: BookingTarget) => {
    if (!venue) return;
    const preview = checkBooking(
      requestFor(venue, next),
      membership.plan ?? undefined,
      membership.subscription,
      membership.bookings,
      Date.now(),
    );
    setTarget(next);
    setPhase(preview ? { step: 'error', error: preview } : { step: 'confirm' });
  };

  const confirm = () => {
    if (!venue || !target) return;
    const result = membership.book(requestFor(venue, target));
    if (result.ok) {
      void haptics.success();
      toast.show({ message: t('booking.success.toast'), tone: 'success' });
      setPhase({ step: 'success' });
    } else {
      void haptics.error();
      setPhase({ step: 'error', error: result.error });
    }
  };

  return { target, phase, open, close: () => setTarget(null), confirm };
}
