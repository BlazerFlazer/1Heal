import type { ComponentType } from 'react';

import { QrIllustration } from './illustrations/QrIllustration';
import { StreaksIllustration } from './illustrations/StreaksIllustration';
import { SubscriptionIllustration } from './illustrations/SubscriptionIllustration';
import type { IllustrationProps } from './illustrations/types';

/** Keys match `onboarding.slides.<key>` in the locale files. */
export type OnboardingSlideKey = 'subscription' | 'qr' | 'streaks';

export type OnboardingSlideDef = {
  key: OnboardingSlideKey;
  Illustration: ComponentType<IllustrationProps>;
};

export const ONBOARDING_SLIDES: readonly OnboardingSlideDef[] = [
  { key: 'subscription', Illustration: SubscriptionIllustration },
  { key: 'qr', Illustration: QrIllustration },
  { key: 'streaks', Illustration: StreaksIllustration },
];
