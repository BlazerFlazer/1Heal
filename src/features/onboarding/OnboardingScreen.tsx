import { router } from 'expo-router';
import { useState } from 'react';

import { useOnboardingStore } from '@/services/session/onboardingStore';

import { OnboardingSlides } from './OnboardingSlides';
import { PermissionPrimingScreen } from './PermissionPrimingScreen';

type OnboardingStep = 'slides' | 'priming';

/**
 * Three slides, then permission priming. Finishing (or skipping) marks onboarding complete
 * and moves to sign-in; the root layout's guard keeps the user out of the member area until
 * they are signed in.
 */
export function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>('slides');
  const complete = useOnboardingStore((state) => state.complete);

  const finish = () => {
    complete();
    router.replace('/(public)/sign-in');
  };

  if (step === 'priming') {
    return <PermissionPrimingScreen onContinue={finish} onSkip={finish} />;
  }
  return <OnboardingSlides onSkip={finish} onFinish={() => setStep('priming')} />;
}
