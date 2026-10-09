import { Stack } from 'expo-router';

/** Member area: the tab bar plus full-screen pushes (plans, legal, later venue and booking). */
export default function MemberLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
