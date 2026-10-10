import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Venue } from '@/services/demo/types';
import { Sheet } from '@/shared/ui/Sheet';

import { BookingConfirm } from './BookingConfirm';
import { BookingErrorView } from './BookingErrorView';
import { BookingSuccess } from './BookingSuccess';
import type { BookingFlow } from './useBookingFlow';

export type BookingSheetProps = {
  venue: Venue;
  flow: BookingFlow;
};

/** The booking bottom sheet: confirm → success, or the reason it cannot be booked. */
export function BookingSheet({ venue, flow }: BookingSheetProps) {
  const { t } = useTranslation();
  // Keep the last target on screen while the sheet animates closed.
  const [shown, setShown] = useState(flow.target);
  if (flow.target !== null && flow.target !== shown) {
    setShown(flow.target);
  }

  const go = (href: '/bookings' | '/subscription/plans') => {
    flow.close();
    router.push(href);
  };

  const { phase } = flow;
  const title = phase.step === 'confirm' ? t('booking.confirm.title') : undefined;

  return (
    <Sheet visible={flow.target !== null} onClose={flow.close} title={title} testID="booking-sheet">
      {shown === null ? null : phase.step === 'confirm' ? (
        <BookingConfirm venue={venue} target={shown} onConfirm={flow.confirm} />
      ) : phase.step === 'success' ? (
        <BookingSuccess onMyBookings={() => go('/bookings')} onDone={flow.close} />
      ) : (
        <BookingErrorView
          error={phase.error}
          venueTier={venue.tier}
          onPlans={() => go('/subscription/plans')}
          onClose={flow.close}
        />
      )}
    </Sheet>
  );
}
