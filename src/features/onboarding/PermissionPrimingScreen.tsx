import { Bell, MapPin, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import { ONBOARDING_TEST_IDS } from './testIds';

export type PermissionPrimingScreenProps = {
  onContinue: () => void;
  onSkip: () => void;
};

type PermissionRowProps = { icon: LucideIcon; title: string; body: string };

function PermissionRow({ icon: Icon, title, body }: PermissionRowProps) {
  const { colors, spacing, radii } = useTheme();
  const circle = spacing[10];

  return (
    <Card>
      <View style={[styles.row, { gap: spacing[3] }]}>
        <View
          aria-hidden
          style={[
            styles.circle,
            {
              width: circle,
              height: circle,
              borderRadius: radii.full,
              backgroundColor: colors.primarySubtle,
            },
          ]}
        >
          <Icon size={spacing[5]} color={colors.onPrimarySubtle} />
        </View>
        <View style={[styles.copy, { gap: spacing[1] }]}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" color="textSecondary">
            {body}
          </Text>
        </View>
      </View>
    </Card>
  );
}

/**
 * Last onboarding step: explains which permissions the app will ask for later and why.
 * It never triggers the system prompts itself; those appear in context, when first needed.
 */
export function PermissionPrimingScreen({ onContinue, onSkip }: PermissionPrimingScreenProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <Screen scroll testID={ONBOARDING_TEST_IDS.priming}>
      <View style={[styles.body, { gap: spacing[4], paddingTop: spacing[6] }]}>
        <View style={{ gap: spacing[2] }}>
          <Text variant="title" accessibilityRole="header">
            {t('onboarding.priming.title')}
          </Text>
          <Text color="textSecondary">{t('onboarding.priming.body')}</Text>
        </View>
        <PermissionRow
          icon={Bell}
          title={t('onboarding.priming.notifications.title')}
          body={t('onboarding.priming.notifications.body')}
        />
        <PermissionRow
          icon={MapPin}
          title={t('onboarding.priming.location.title')}
          body={t('onboarding.priming.location.body')}
        />
        <Text variant="caption" color="textSecondary">
          {t('onboarding.priming.note')}
        </Text>
      </View>
      <View style={{ gap: spacing[2], paddingTop: spacing[6] }}>
        <Button
          label={t('common.actions.continue')}
          onPress={onContinue}
          fullWidth
          testID={ONBOARDING_TEST_IDS.primingContinue}
        />
        <Button
          label={t('common.actions.skip')}
          onPress={onSkip}
          variant="ghost"
          haptic="none"
          fullWidth
          testID={ONBOARDING_TEST_IDS.primingSkip}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
});
