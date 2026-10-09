import { Redirect } from 'expo-router';

import { resolveEntryHref, useShellState } from '@/shared/providers';

/** Anchor route: `Stack.Protected` lands here whenever a guard closes, and we forward on. */
export default function Index() {
  const state = useShellState();
  return <Redirect href={resolveEntryHref(state)} />;
}
