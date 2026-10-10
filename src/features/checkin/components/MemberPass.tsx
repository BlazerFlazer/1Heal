import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { text } from '@/services/demo/catalog';
import type { MembershipView } from '@/services/membership/useMembership';
import { useFormatters, useLocale } from '@/shared/i18n';
import { palette, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';

import { memberShortId } from '../qrPattern';
import { PseudoQr } from './PseudoQr';

export type MemberPassProps = Pick<
  MembershipView,
  'plan' | 'subscription' | 'visitsLeft' | 'userId'
> & { now: number };

const QR_SIZE = 196;
const MINUTE_MS = 60_000;

/** Green member pass: plan, member id, validity and the minute-rotating (decorative) code. */
export function MemberPass({ plan, subscription, visitsLeft, userId, now }: MemberPassProps) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatDate } = useFormatters();
  const { radii, spacing, elevation } = useTheme();
  if (!plan || !subscription || !userId) return null;

  const onGreen = { color: palette.white };
  const muted = { color: palette.green[100] };

  return (
    <LinearGradient
      colors={[palette.green[600], palette.green[800], palette.green[900]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      testID="qr-pass"
      style={[
        styles.card,
        { borderRadius: radii.lg, padding: spacing[5], gap: spacing[4] },
        elevation(3),
      ]}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="overline" style={{ color: palette.green[200] }}>
            {t('qr.pass.eyebrow').toUpperCase()}
          </Text>
          <Text variant="title" style={onGreen} numberOfLines={1}>
            {text(plan.name, locale)}
          </Text>
        </View>
        <View style={styles.end}>
          <Text variant="caption" style={muted}>
            {t('qr.pass.memberId')}
          </Text>
          <Text variant="bodyStrong" style={onGreen} testID="qr-member-id">
            {memberShortId(userId)}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.qrBox,
          { borderRadius: radii.md, padding: spacing[4], backgroundColor: palette.white },
        ]}
      >
        <PseudoQr
          userId={userId}
          minute={Math.floor(now / MINUTE_MS)}
          size={QR_SIZE}
          color={palette.green[900]}
          background={palette.white}
          accessibilityLabel={t('qr.pass.codeA11y')}
          testID="qr-code"
        />
      </View>
      <View style={[styles.refresh, { gap: spacing[2] }]}>
        <RefreshCw size={spacing[4]} color={palette.green[200]} />
        <Text variant="label" style={muted}>
          {t('qr.pass.refreshes')}
        </Text>
      </View>
      <View style={styles.header}>
        <Text variant="label" style={onGreen}>
          {t('qr.pass.visitsLeft', { left: visitsLeft, total: plan.visitsPerMonth })}
        </Text>
        <Text variant="label" style={muted}>
          {t('qr.pass.validUntil', { date: formatDate(new Date(subscription.periodEnd)) })}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', alignSelf: 'stretch' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  end: { alignItems: 'flex-end' },
  qrBox: { alignSelf: 'center' },
  refresh: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
