import { router } from 'expo-router';

/** Legal pages are reachable by deep link, so "back" must work without history too. */
export function leaveLegal(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(public)/sign-in');
}
