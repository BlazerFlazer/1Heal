import { Stack } from 'expo-router';

/** Partner (venue staff) area: the tab bar plus later full-screen pushes (manual check-in). */
export default function PartnerLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
