import {
  Bell,
  FlaskConical,
  Heart,
  History,
  Languages,
  LifeBuoy,
  Scale,
  Store,
  SunMoon,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { ListItem } from '@/shared/ui/ListItem';
import { DISABLED_OPACITY } from '@/shared/ui/Pressable';
import { Section } from '@/shared/ui/Section';

import { openSupport } from '../support';

/** Sheets the menu can ask the screen to open. */
export type ProfileSheetKey = 'language' | 'theme' | 'legal';

export type ProfileMenuProps = {
  /** Native name of the active language, shown on the Language row. */
  localeLabel: string;
  /** Localised name of the theme preference, shown on the Theme row. */
  themeLabel: string;
  showPartnerSwitch: boolean;
  showGallery: boolean;
  onOpen: (sheet: ProfileSheetKey) => void;
  onSwitchToPartner: () => void;
  onOpenGallery: () => void;
};

function MenuIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { colors, spacing } = useTheme();
  return <Icon size={spacing[5]} color={colors.textSecondary} />;
}

function MenuGroup({
  title,
  children,
  testID,
}: {
  title: string;
  children: ReactNode;
  testID: string;
}) {
  return (
    <Section title={title} testID={testID}>
      <Card padding={0} style={styles.group}>
        {children}
      </Card>
    </Section>
  );
}

/** Grouped settings rows. Rows whose feature ships later are dimmed and badged "soon". */
export function ProfileMenu({
  localeLabel,
  themeLabel,
  showPartnerSwitch,
  showGallery,
  onOpen,
  onSwitchToPartner,
  onOpenGallery,
}: ProfileMenuProps) {
  const { t } = useTranslation();
  const soon = () => <Badge size="sm" label={t('profile.menu.soon')} />;

  return (
    <>
      <MenuGroup title={t('profile.sections.settings')} testID="profile-settings">
        <ListItem
          title={t('profile.menu.language')}
          leading={<MenuIcon icon={Languages} />}
          trailingText={localeLabel}
          chevron
          divider
          onPress={() => onOpen('language')}
          testID="profile-language"
        />
        <ListItem
          title={t('profile.menu.theme')}
          leading={<MenuIcon icon={SunMoon} />}
          trailingText={themeLabel}
          chevron
          divider
          onPress={() => onOpen('theme')}
          testID="profile-theme"
        />
        <ListItem
          title={t('profile.menu.notifications')}
          leading={<MenuIcon icon={Bell} />}
          trailing={soon()}
          style={styles.disabled}
          testID="profile-notifications"
        />
      </MenuGroup>

      <MenuGroup title={t('profile.sections.activity')} testID="profile-activity">
        <ListItem
          title={t('profile.menu.favorites')}
          leading={<MenuIcon icon={Heart} />}
          trailing={soon()}
          divider
          style={styles.disabled}
          testID="profile-favorites"
        />
        <ListItem
          title={t('profile.menu.history')}
          leading={<MenuIcon icon={History} />}
          trailing={soon()}
          style={styles.disabled}
          testID="profile-history"
        />
      </MenuGroup>

      <MenuGroup title={t('profile.sections.about')} testID="profile-about">
        <ListItem
          title={t('profile.menu.support')}
          leading={<MenuIcon icon={LifeBuoy} />}
          divider
          onPress={openSupport}
          testID="profile-support"
        />
        <ListItem
          title={t('profile.menu.legal')}
          leading={<MenuIcon icon={Scale} />}
          divider={showPartnerSwitch || showGallery}
          onPress={() => onOpen('legal')}
          testID="profile-legal"
        />
        {showPartnerSwitch ? (
          <ListItem
            title={t('profile.menu.switchToPartner')}
            leading={<MenuIcon icon={Store} />}
            divider={showGallery}
            onPress={onSwitchToPartner}
            testID="profile-switch-partner"
          />
        ) : null}
        {showGallery ? (
          <ListItem
            title={t('profile.menu.devGallery')}
            leading={<MenuIcon icon={FlaskConical} />}
            onPress={onOpenGallery}
            testID="profile-dev-gallery"
          />
        ) : null}
      </MenuGroup>
    </>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden' },
  disabled: { opacity: DISABLED_OPACITY },
});
