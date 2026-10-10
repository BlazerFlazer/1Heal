import { MapPin, Navigation, Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { Venue } from '@/services/demo/types';
import { formatPhone, useLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';

/** Yandex Maps works best in Tashkent; the web URL opens the app when it is installed. */
export function mapsUrl(venue: Pick<Venue, 'lat' | 'lng'>): string {
  return `https://yandex.uz/maps/?pt=${venue.lng},${venue.lat}&z=17&l=map`;
}

/** Address with "open in maps" and a call button. */
export function LocationCard({ venue }: { venue: Venue }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors, spacing, radii } = useTheme();
  const phone = formatPhone(venue.phone);

  return (
    <View
      style={[
        { gap: spacing[4], padding: spacing[4], borderRadius: radii.lg },
        { backgroundColor: colors.surface },
      ]}
      testID="venue-location"
    >
      <View style={[styles.row, { gap: spacing[3] }]}>
        <MapPin size={20} color={colors.primary} />
        <Text variant="body" style={styles.flex}>
          {text(venue.address, locale)}
        </Text>
      </View>
      <View style={[styles.row, { gap: spacing[3] }]}>
        <Button
          label={t('venue.location.openMaps')}
          leftIcon={Navigation}
          variant="secondary"
          onPress={() => void Linking.openURL(mapsUrl(venue)).catch(() => undefined)}
          style={styles.flex}
          testID="venue-open-maps"
        />
        <Button
          label={t('venue.location.call')}
          accessibilityLabel={t('venue.location.callA11y', { phone })}
          leftIcon={Phone}
          variant="outline"
          onPress={() => void Linking.openURL(`tel:${venue.phone}`).catch(() => undefined)}
          testID="venue-call"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
