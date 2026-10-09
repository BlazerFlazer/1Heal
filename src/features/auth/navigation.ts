import { router } from 'expo-router';

/** Documents linked from the consent line. */
export type ConsentDoc = 'terms' | 'privacy';

export function goToVerify(phoneE164: string, resendAfterSec: number): void {
  router.push({
    pathname: '/(public)/verify',
    params: { phone: phoneE164, resendAfterSec: String(resendAfterSec) },
  });
}

/** Back to the phone screen; the code screen is deep-linkable, so "back" may have no history. */
export function goToSignIn(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(public)/sign-in');
}

export function openLegalDoc(doc: ConsentDoc): void {
  router.push({ pathname: '/(public)/legal/[doc]', params: { doc } });
}
