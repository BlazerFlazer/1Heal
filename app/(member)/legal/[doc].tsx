import { useLocalSearchParams } from 'expo-router';

import { LegalDocScreen } from '@/features/legal';

/** Same documents as the public `legal/[doc]` route, reachable from the profile when signed in. */
export default function MemberLegalRoute() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  return <LegalDocScreen doc={doc} />;
}
