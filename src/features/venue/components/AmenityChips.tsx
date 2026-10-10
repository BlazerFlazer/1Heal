import {
  Accessibility,
  Baby,
  Check,
  CircleParking,
  Coffee,
  CupSoda,
  Dumbbell,
  Droplets,
  Lock,
  Package,
  Shirt,
  ShowerHead,
  Snowflake,
  ThermometerSun,
  WavesLadder,
  Wifi,
  Wind,
  Layers,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

const ICONS: Record<string, LucideIcon> = {
  showers: ShowerHead,
  lockers: Lock,
  parking: CircleParking,
  wifi: Wifi,
  towels: Shirt,
  air_conditioning: Snowflake,
  personal_training: Dumbbell,
  sauna: ThermometerSun,
  water: Droplets,
  cafe: Coffee,
  hairdryer: Wind,
  kids_room: Baby,
  tea_lounge: CupSoda,
  mats_provided: Layers,
  equipment_rental: Package,
  pool: WavesLadder,
  wheelchair_access: Accessibility,
};

/** Venue amenities as quiet icon pills that wrap onto several lines. */
export function AmenityChips({ amenities }: { amenities: readonly string[] }) {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();

  return (
    <View style={[styles.wrap, { gap: spacing[2] }]} testID="venue-amenities">
      {amenities.map((key) => {
        const Icon = ICONS[key] ?? Check;
        return (
          <View
            key={key}
            style={[
              styles.pill,
              { gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
              {
                backgroundColor: colors.surface,
                borderRadius: radii.full,
                borderColor: colors.border,
              },
            ]}
          >
            <Icon size={16} color={colors.primary} />
            <Text variant="label">{t(`venue.amenities.${key}`, { defaultValue: key })}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
