import { LinearGradient } from 'expo-linear-gradient';
import { CalendarCheck, Dumbbell, MapPin, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

const POINTS: { key: string; icon: LucideIcon }[] = [
  { key: 'venues', icon: Dumbbell },
  { key: 'booking', icon: CalendarCheck },
  { key: 'freedom', icon: MapPin },
];

/** Soft brand gradient hero at the top of the plans screen. */
export function PlansHero() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();

  return (
    <LinearGradient
      colors={[colors.primarySubtle, colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { borderRadius: radii.lg, padding: spacing[6], gap: spacing[3] }]}
      testID="plans-hero"
    >
      <View
        style={[styles.orb, { backgroundColor: colors.primary, borderRadius: radii.full }]}
        aria-hidden
      />
      <Text variant="overline" color="onPrimarySubtle">
        {t('subscription.plans.heroOverline').toUpperCase()}
      </Text>
      <Text variant="display" accessibilityRole="header">
        {t('subscription.plans.heroTitle')}
      </Text>
      <Text color="textSecondary">{t('subscription.plans.heroSubtitle')}</Text>
      <View style={[styles.points, { gap: spacing[2], marginTop: spacing[1] }]}>
        {POINTS.map(({ key, icon: Icon }) => (
          <View
            key={key}
            style={[
              styles.point,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: radii.full,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                gap: spacing[2],
              },
            ]}
          >
            <Icon size={16} color={colors.primary} />
            <Text variant="label">{t(`subscription.plans.heroPoints.${key}`)}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const ORB = 180;

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
  orb: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    top: -ORB / 3,
    right: -ORB / 3,
    opacity: 0.08,
  },
  points: { flexDirection: 'row', flexWrap: 'wrap' },
  point: { flexDirection: 'row', alignItems: 'center' },
});
