import { Linking } from 'react-native';

import { SUPPORT_EMAIL } from '@/shared/config/brand';

export const SUPPORT_URL = `mailto:${SUPPORT_EMAIL}`;

/** Opens the mail client; a device without one simply does nothing (no crash, no toast). */
export function openSupport(): void {
  void Linking.openURL(SUPPORT_URL).catch(() => undefined);
}
