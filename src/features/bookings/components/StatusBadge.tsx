import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';

import { Badge, type BadgeTone } from '@/shared/ui/Badge';

import type { BookingPhase } from '../bookingView';

const TONES: Record<BookingPhase, BadgeTone> = {
  upcoming: 'success',
  ongoing: 'info',
  visited: 'success',
  cancelled: 'neutral',
  late_cancelled: 'warning',
};

/** Short label shown in the badge. */
export const STATUS_LABEL_KEYS = {
  upcoming: 'bookings.status.confirmed',
  ongoing: 'bookings.status.ongoing',
  visited: 'bookings.status.visited',
  cancelled: 'bookings.status.cancelled',
  late_cancelled: 'bookings.status.lateCancelled',
} as const satisfies Record<BookingPhase, string>;

/** Full spoken status (a late cancellation also says the visit was used). */
export const STATUS_A11Y_KEYS = {
  ...STATUS_LABEL_KEYS,
  late_cancelled: 'bookings.status.lateCancelledNote',
} as const satisfies Record<BookingPhase, string>;

type Props = { phase: BookingPhase; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> };

export function StatusBadge({ phase, size = 'sm', style }: Props) {
  const { t } = useTranslation();
  return (
    <Badge
      tone={TONES[phase]}
      size={size}
      label={t(STATUS_LABEL_KEYS[phase])}
      accessibilityLabel={t(STATUS_A11Y_KEYS[phase])}
      style={style}
    />
  );
}
