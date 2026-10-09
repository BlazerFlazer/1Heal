import { useLocalSearchParams } from 'expo-router';

import { LegalDocScreen } from '@/features/legal';

export default function LegalDocRoute() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  return <LegalDocScreen doc={doc} />;
}
