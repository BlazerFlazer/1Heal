/** Stable ids shared by component tests and the Maestro flows in `e2e/`. */
export const ONBOARDING_TEST_IDS = {
  screen: 'onboarding',
  skip: 'onboarding-skip',
  next: 'onboarding-next',
  pager: 'onboarding-pager',
  dots: 'onboarding-dots',
  dot: (index: number) => `onboarding-dot-${index}`,
  slide: (key: string) => `onboarding-slide-${key}`,
  priming: 'priming',
  primingContinue: 'priming-continue',
  primingSkip: 'priming-skip',
} as const;
