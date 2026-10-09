import { Tabs } from 'expo-router';
import { BarChart3, CalendarCheck, ScanLine, Settings2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { tabIcon, useTabBarScreenOptions } from '@/shared/providers';

type PartnerTabKey = 'scan' | 'today' | 'stats' | 'settings';

type PartnerTab = { name: PartnerTabKey; icon: ReturnType<typeof tabIcon> };

const PARTNER_TABS: readonly PartnerTab[] = [
  { name: 'scan', icon: tabIcon(ScanLine) },
  { name: 'today', icon: tabIcon(CalendarCheck) },
  { name: 'stats', icon: tabIcon(BarChart3) },
  { name: 'settings', icon: tabIcon(Settings2) },
];

export default function PartnerTabsLayout() {
  const { t } = useTranslation();
  const screenOptions = useTabBarScreenOptions();

  return (
    <Tabs screenOptions={screenOptions}>
      {PARTNER_TABS.map(({ name, icon }) => {
        const label = t(`tabs.partner.${name}`);
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: label,
              tabBarAccessibilityLabel: label,
              tabBarButtonTestID: `tab-${name}`,
              tabBarIcon: icon,
            }}
          />
        );
      })}
    </Tabs>
  );
}
