import { useLocalSearchParams } from 'expo-router';

import { VenueScreen } from '@/features/venue/screens/VenueScreen';

export default function VenueRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VenueScreen id={typeof id === 'string' ? id : ''} />;
}
