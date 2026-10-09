import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useLocale, type Locale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme/ThemeProvider';
import {
  THEME_PREFERENCES,
  useThemePreference,
  type ThemePreference,
} from '@/shared/theme/themeStore';
import { Tabs, type TabItem } from '@/shared/ui/Tabs';
import { Text } from '@/shared/ui/Text';

/** Gallery title plus live theme (system/light/dark) and language switches. */
export function GalleryHeader() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { locale, setLocale, locales } = useLocale();

  const themeItems: TabItem<ThemePreference>[] = THEME_PREFERENCES.map((key) => ({
    key,
    label: t(`ui.gallery.themeOptions.${key}`),
  }));
  const localeItems: TabItem<Locale>[] = locales.map((option) => ({
    key: option.code,
    label: option.nativeName,
  }));

  return (
    <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4], gap: spacing[3] }}>
      <Text variant="title" accessibilityRole="header">
        {t('ui.gallery.title')}
      </Text>
      <Text color="textSecondary">{t('ui.gallery.subtitle')}</Text>
      <Tabs
        testID="gallery-theme"
        accessibilityLabel={t('ui.gallery.theme')}
        items={themeItems}
        value={preference}
        onChange={setPreference}
      />
      <Tabs
        testID="gallery-locale"
        accessibilityLabel={t('ui.gallery.language')}
        items={localeItems}
        value={locale}
        onChange={(code) => {
          void setLocale(code);
        }}
      />
    </View>
  );
}
