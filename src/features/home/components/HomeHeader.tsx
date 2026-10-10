import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuthStore } from '@/services/auth/authStore';
import type { MembershipView } from '@/services/membership/useMembership';
import { useFormatters } from '@/shared/i18n';
import { palette, useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { PressableScale } from '@/shared/ui/Pressable';
import { Text } from '@/shared/ui/Text';

import { useGreeting } from '../useGreeting';
import { MembershipSummary } from './MembershipSummary';
import { PlanPromo } from './PlanPromo';

export type HomeHeaderProps = {
  membership: Pick<MembershipView, 'active' | 'plan' | 'subscription' | 'visitsLeft'>;
  venueCount: number | undefined;
  now: number;
  /** Horizontal gutter shared with the rest of the screen. */
  gutter: number;
};

/** Soft brand gradient with greeting, today's date and the membership summary (or a promo). */
export function HomeHeader({ membership, venueCount, now, gutter }: HomeHeaderProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const { colors, spacing, radii, isDark } = useTheme();
  const fullName = useAuthStore((state) => state.session?.profile.fullName);
  const greeting = useGreeting(fullName, new Date(now));
  const gradient = isDark
    ? ([colors.surfaceElevated, colors.background] as const)
    : ([palette.green[100], palette.green[50], colors.background] as const);

  return (
    <LinearGradient
      colors={gradient}
      testID="home-header"
      style={[
        styles.block,
        {
          paddingHorizontal: gutter,
          paddingTop: spacing[4],
          paddingBottom: spacing[6],
          gap: spacing[5],
          borderBottomLeftRadius: radii.lg,
          borderBottomRightRadius: radii.lg,
        },
      ]}
    >
      <View style={[styles.top, { gap: spacing[3] }]}>
        <View style={styles.titles}>
          <Text variant="label" color="textSecondary">
            {formatDate(new Date(now), 'weekday')}
          </Text>
          <Text variant="title" accessibilityRole="header" numberOfLines={2}>
            {greeting}
          </Text>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('home.profileA11y')}
          onPress={() => router.push('/profile')}
          hapticsEnabled
          testID="home-avatar"
        >
          <Avatar name={fullName} size="lg" accessibilityLabel={t('home.profileA11y')} />
        </PressableScale>
      </View>
      <Animated.View entering={FadeInDown.duration(420)}>
        {membership.active ? (
          <MembershipSummary
            plan={membership.plan}
            subscription={membership.subscription}
            visitsLeft={membership.visitsLeft}
          />
        ) : (
          <PlanPromo venueCount={venueCount} />
        )}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center' },
  titles: { flex: 1 },
});
