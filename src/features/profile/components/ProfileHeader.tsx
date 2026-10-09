import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Session } from '@/services/auth/types';
import { formatPhone } from '@/shared/i18n';
import { useTheme } from '@/shared/theme';
import { Avatar } from '@/shared/ui/Avatar';
import { Text } from '@/shared/ui/Text';

export type ProfileHeaderProps = { session: Session | null };

/** Avatar with initials, display name (or a neutral fallback) and the formatted phone number. */
export function ProfileHeader({ session }: ProfileHeaderProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const name = session?.profile.fullName?.trim();
  const hasName = name !== undefined && name.length > 0;
  const displayName = hasName ? name : t('profile.anonymous');
  const phone = session ? formatPhone(session.phoneE164) : null;

  return (
    <View style={[styles.row, { gap: spacing[4] }]} testID="profile-header">
      <Avatar
        name={hasName ? name : undefined}
        size="xl"
        accessibilityLabel={t('profile.avatarLabel', { name: displayName })}
        testID="profile-avatar"
      />
      <View style={styles.body}>
        <Text variant="title" accessibilityRole="header" numberOfLines={1}>
          {displayName}
        </Text>
        {phone ? (
          <Text color="textSecondary" selectable testID="profile-phone">
            {phone}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1 },
});
