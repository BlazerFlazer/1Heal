import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { Text } from '@/shared/ui/Text';

/** The version from `app.json`; `null` when the config is unavailable (bare web preview). */
export function appVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

export function AppVersion() {
  const { t } = useTranslation();
  const version = appVersion();
  if (version === null) return null;
  return (
    <Text variant="caption" color="textSecondary" align="center" testID="profile-version">
      {t('profile.version', { version })}
    </Text>
  );
}
