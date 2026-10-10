import { useLocalSearchParams } from 'expo-router';

import { DiscoverScreen } from '@/features/discover/screens/DiscoverScreen';

export default function DiscoverRoute() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  return <DiscoverScreen category={typeof category === 'string' ? category : undefined} />;
}
