import { Stack } from 'expo-router';

/** Onboarding, sign-in and legal pages: no native headers, each screen draws its own. */
export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
