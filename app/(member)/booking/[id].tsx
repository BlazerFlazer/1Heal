import { useLocalSearchParams } from 'expo-router';

import { BookingDetailScreen } from '@/features/bookings/screens/BookingDetailScreen';

export default function BookingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookingDetailScreen id={id} />;
}
