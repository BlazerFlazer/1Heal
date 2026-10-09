import { LogOut, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/services/auth/authStore';
import { useSignOut } from '@/services/auth/useSignOut';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ListItem } from '@/shared/ui/ListItem';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Sheet } from '@/shared/ui/Sheet';
import { Text } from '@/shared/ui/Text';

/** Staff settings: back to member mode, sign out. Venue settings (staff list) arrive in M7. */
export function PartnerSettingsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const setActiveMode = useAuthStore((state) => state.setActiveMode);
  const { busy, signOut } = useSignOut();
  const [confirming, setConfirming] = useState(false);
  const close = () => setConfirming(false);

  return (
    <Screen
      scroll
      edges={['top']}
      header={<OfflineBanner testID="partner-settings-offline" />}
      contentStyle={{ gap: spacing[6] }}
      testID="partner-settings"
    >
      <Text variant="title" accessibilityRole="header">
        {t('partner.settings.title')}
      </Text>
      <Card padding={0} style={styles.group}>
        <ListItem
          title={t('partner.settings.switchToMember')}
          leading={<UserRound size={spacing[5]} color={colors.textSecondary} />}
          onPress={() => setActiveMode('member')}
          testID="partner-switch-member"
        />
      </Card>
      <Button
        label={t('common.actions.signOut')}
        variant="outline"
        leftIcon={LogOut}
        fullWidth
        onPress={() => setConfirming(true)}
        testID="partner-sign-out"
      />

      <Sheet
        visible={confirming}
        onClose={close}
        title={t('partner.settings.signOut.title')}
        testID="partner-sign-out-sheet"
      >
        <View style={{ gap: spacing[3] }}>
          <Text color="textSecondary">{t('partner.settings.signOut.body')}</Text>
          <Button
            label={t('partner.settings.signOut.confirm')}
            variant="destructive"
            loading={busy}
            fullWidth
            onPress={() => {
              void signOut();
            }}
            testID="partner-sign-out-confirm"
          />
          <Button
            label={t('partner.settings.signOut.cancel')}
            variant="ghost"
            disabled={busy}
            fullWidth
            onPress={close}
            testID="partner-sign-out-cancel"
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
});
