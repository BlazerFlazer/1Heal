import { useAuthStore } from '@/services/auth/authStore';
import { useTheme } from '@/shared/theme';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';

import { NearbySection } from '../components/NearbySection';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { useGreeting } from '../useGreeting';

/** Member home: greeting, subscription status and nearby venues. The tab bar pads the bottom. */
export function HomeScreen() {
  const { spacing } = useTheme();
  const fullName = useAuthStore((state) => state.session?.profile.fullName);
  const greeting = useGreeting(fullName);

  return (
    <Screen
      scroll
      edges={['top']}
      header={<OfflineBanner testID="home-offline" />}
      contentStyle={{ gap: spacing[6] }}
      testID="home"
    >
      <Text variant="title" accessibilityRole="header">
        {greeting}
      </Text>
      <SubscriptionCard />
      <NearbySection status="empty" />
    </Screen>
  );
}
