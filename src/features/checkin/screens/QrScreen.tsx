import { router } from 'expo-router';
import { Info, QrCode, SunMedium, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useMembership } from '@/services/membership/useMembership';
import { useNetworkStatus } from '@/services/network/useNetworkStatus';
import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { useNow } from '@/shared/utils/useNow';

import { MemberPass } from '../components/MemberPass';
import { NextBookingRow, nextBooking } from '../components/NextBookingRow';

/** Refresh often enough that the minute-rotating code changes on time. */
const CLOCK_MS = 15_000;

function openPlans(): void {
  router.push('/subscription/plans');
}

/** Member QR hub: the pass with a rotating code when subscribed, otherwise a CTA to plans. */
export function QrScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { isOnline } = useNetworkStatus();
  const membership = useMembership();
  const now = useNow(CLOCK_MS);
  const subscribed = membership.active && membership.plan !== null;
  const upcoming = subscribed ? nextBooking(membership.bookings, now) : undefined;

  const hint = (Icon: typeof Info, copy: string, testID: string) => (
    <View testID={testID} style={[styles.note, { gap: spacing[2] }]}>
      <Icon size={spacing[4]} color={colors.textSecondary} />
      <Text variant="caption" color="textSecondary" style={styles.flex}>
        {copy}
      </Text>
    </View>
  );

  return (
    <Screen
      scroll
      edges={['top']}
      padding={5}
      header={<OfflineBanner testID="qr-offline" />}
      contentStyle={{ gap: spacing[5] }}
      testID="qr"
    >
      <View style={{ gap: spacing[1] }}>
        <Text variant="title" accessibilityRole="header">
          {t('qr.title')}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('qr.subtitle')}
        </Text>
      </View>
      {subscribed ? (
        <Animated.View entering={FadeInDown.duration(420)} style={{ gap: spacing[4] }}>
          <MemberPass
            plan={membership.plan}
            subscription={membership.subscription}
            visitsLeft={membership.visitsLeft}
            userId={membership.userId}
            now={now}
          />
          {hint(SunMedium, t('qr.brightness'), 'qr-brightness')}
          {hint(Info, t('qr.pass.demoNote'), 'qr-demo-note')}
          {upcoming ? <NextBookingRow booking={upcoming} now={now} /> : null}
        </Animated.View>
      ) : (
        <Card radius="lg" elevation={1} padding={6} testID="qr-card">
          <EmptyState
            icon={QrCode}
            title={t('qr.inactive.title')}
            body={t('qr.inactive.body')}
            primaryAction={{ label: t('qr.inactive.cta'), onPress: openPlans }}
            style={{ padding: spacing[0] }}
            testID="qr-inactive"
          />
        </Card>
      )}
      {isOnline === false ? (
        <View accessibilityLiveRegion="polite">
          {hint(WifiOff, t('qr.offlineNote'), 'qr-offline-note')}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
