import { UserX, Users, Wallet, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Card } from '@/shared/ui/Card';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

export type StatKey = 'visits' | 'noShows' | 'payout';

/** Shown in place of a number until `rpc_partner_stats` exists (M7). */
export const STAT_PLACEHOLDER = '—';

const STATS: readonly { key: StatKey; icon: LucideIcon }[] = [
  { key: 'visits', icon: Users },
  { key: 'noShows', icon: UserX },
  { key: 'payout', icon: Wallet },
];

/** Three headline numbers for the venue; placeholders with captions until data lands. */
export function StatsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <Screen
      scroll
      edges={['top']}
      header={<OfflineBanner testID="stats-offline" />}
      contentStyle={{ gap: spacing[4] }}
      testID="stats"
    >
      <Text variant="title" accessibilityRole="header">
        {t('partner.stats.title')}
      </Text>
      {STATS.map(({ key, icon: Icon }) => {
        const label = t(`partner.stats.cards.${key}.label`);
        const caption = t(`partner.stats.cards.${key}.caption`);
        return (
          <Card
            key={key}
            accessibilityLabel={`${label}: ${STAT_PLACEHOLDER}. ${caption}`}
            style={{ gap: spacing[2] }}
            testID={`stats-${key}`}
          >
            <View style={[styles.row, { gap: spacing[2] }]}>
              <Icon size={spacing[5]} color={colors.textSecondary} />
              <Text variant="label" color="textSecondary">
                {label}
              </Text>
            </View>
            <Text variant="display" testID={`stats-${key}-value`}>
              {STAT_PLACEHOLDER}
            </Text>
            <Text variant="caption" color="textSecondary">
              {caption}
            </Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
