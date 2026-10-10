import type { BookingError } from '@/domain/membership';

/** What the member is about to book at the open venue: a class session or a drop-in hour. */
export type BookingTarget = {
  kind: 'class' | 'dropIn';
  /** Class name (localized) for classes; unused for drop-ins. */
  title: string;
  sessionId: string | null;
  startsAt: number;
  endsAt: number;
  /** Free spots before this booking (ignored for drop-ins). */
  spotsLeft: number;
};

export type BookingPhase =
  { step: 'confirm' } | { step: 'success' } | { step: 'error'; error: BookingError };

/** Where an error's call to action leads. */
export type BookingErrorAction = 'plans' | 'upgrade' | null;

export function errorAction(error: BookingError): BookingErrorAction {
  switch (error) {
    case 'NO_SUBSCRIPTION':
    case 'SUBSCRIPTION_EXPIRED':
      return 'plans';
    case 'TIER_NOT_ALLOWED':
    case 'QUOTA_EXCEEDED':
      return 'upgrade';
    default:
      return null;
  }
}
