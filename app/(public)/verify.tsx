import { useLocalSearchParams } from 'expo-router';

import { VerifyScreen } from '@/features/auth';

export default function VerifyRoute() {
  const params = useLocalSearchParams();
  return <VerifyScreen params={params} />;
}
