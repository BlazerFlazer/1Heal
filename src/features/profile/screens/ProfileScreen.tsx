import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LEGAL_DOCS } from '@/features/legal';
import { useAuthStore, useHasRole } from '@/services/auth/authStore';
import { useSignOut } from '@/services/auth/useSignOut';
import { useLocale } from '@/shared/i18n';
import { THEME_PREFERENCES, useTheme, useThemePreference } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';

import { AppVersion } from '../components/AppVersion';
import { OptionSheet } from '../components/OptionSheet';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileMenu, type ProfileSheetKey } from '../components/ProfileMenu';
import { SignOutSheet } from '../components/SignOutSheet';

type ProfileSheet = ProfileSheetKey | 'signOut' | null;

/** Profile hub: identity, language and theme, placeholders for later features, sign out. */
export function ProfileScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const session = useAuthStore((state) => state.session);
  const setActiveMode = useAuthStore((state) => state.setActiveMode);
  const isPartner = useHasRole('partner');
  const { locale, setLocale, locales } = useLocale();
  const { preference, setPreference } = useThemePreference();
  const { busy, signOut } = useSignOut();
  const [sheet, setSheet] = useState<ProfileSheet>(null);
  const close = () => setSheet(null);

  const localeOptions = locales.map(({ code, nativeName }) => ({ key: code, label: nativeName }));
  const themeOptions = THEME_PREFERENCES.map((key) => ({
    key,
    label: t(`profile.themeOptions.${key}`),
  }));
  const legalOptions = LEGAL_DOCS.map((doc) => ({ key: doc, label: t(`legal.docs.${doc}.title`) }));

  return (
    <Screen
      scroll
      edges={['top']}
      header={<OfflineBanner testID="profile-offline" />}
      contentStyle={{ gap: spacing[6] }}
      testID="profile"
    >
      <ProfileHeader session={session} />
      <ProfileMenu
        localeLabel={localeOptions.find((option) => option.key === locale)?.label ?? locale}
        themeLabel={t(`profile.themeOptions.${preference}`)}
        showPartnerSwitch={isPartner}
        showGallery={__DEV__}
        onOpen={setSheet}
        onSwitchToPartner={() => setActiveMode('partner')}
        onOpenGallery={() => router.push('/dev/gallery')}
      />
      <Button
        label={t('common.actions.signOut')}
        variant="outline"
        leftIcon={LogOut}
        fullWidth
        onPress={() => setSheet('signOut')}
        testID="profile-sign-out"
      />
      <AppVersion />

      <OptionSheet
        visible={sheet === 'language'}
        onClose={close}
        title={t('profile.menu.language')}
        options={localeOptions}
        value={locale}
        onSelect={(code) => {
          close();
          void setLocale(code);
        }}
        testID="profile-language-sheet"
      />
      <OptionSheet
        visible={sheet === 'theme'}
        onClose={close}
        title={t('profile.menu.theme')}
        options={themeOptions}
        value={preference}
        onSelect={(next) => {
          setPreference(next);
          close();
        }}
        testID="profile-theme-sheet"
      />
      <OptionSheet
        visible={sheet === 'legal'}
        onClose={close}
        title={t('profile.menu.legal')}
        options={legalOptions}
        onSelect={(doc) => {
          close();
          router.push({ pathname: '/(member)/legal/[doc]', params: { doc } });
        }}
        testID="profile-legal-sheet"
      />
      <SignOutSheet
        visible={sheet === 'signOut'}
        busy={busy}
        onClose={close}
        onConfirm={() => {
          void signOut();
        }}
        testID="profile-sign-out-sheet"
      />
    </Screen>
  );
}
