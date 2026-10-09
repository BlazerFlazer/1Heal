import { Tabs } from 'expo-router';
import { CalendarDays, Compass, Home, QrCode, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { tabIcon, useTabBarScreenOptions } from '@/shared/providers';

type MemberTabKey = 'home' | 'discover' | 'bookings' | 'qr' | 'profile';

type MemberTab = { name: string; key: MemberTabKey; icon: ReturnType<typeof tabIcon> };

const MEMBER_TABS: readonly MemberTab[] = [
  { name: 'index', key: 'home', icon: tabIcon(Home) },
  { name: 'discover', key: 'discover', icon: tabIcon(Compass) },
  { name: 'bookings', key: 'bookings', icon: tabIcon(CalendarDays) },
  { name: 'qr', key: 'qr', icon: tabIcon(QrCode) },
  { name: 'profile', key: 'profile', icon: tabIcon(UserRound) },
];

export default function MemberTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useTabBarScreenOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      {MEMBER_TABS.map(({ name, key, icon }) => {
        const label = t(`tabs.member.${key}`);
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: label,
              tabBarAccessibilityLabel: label,
              tabBarButtonTestID: `tab-${key}`,
              tabBarIcon: icon,
            }}
          />
        );
      })}
    </Tabs>
  );
}
