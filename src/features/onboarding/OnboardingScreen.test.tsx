import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useOnboardingStore } from '@/services/session/onboardingStore';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

import { OnboardingScreen } from './OnboardingScreen';
import { ONBOARDING_SLIDES } from './slides';
import { ONBOARDING_TEST_IDS } from './testIds';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    medium: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
    warning: jest.fn(async () => undefined),
    error: jest.fn(async () => undefined),
  },
}));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const replace = jest.mocked(router.replace);

function renderOnboarding() {
  return render(
    <ThemeProvider scheme="light">
      <OnboardingScreen />
    </ThemeProvider>,
  );
}

describe('OnboardingScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.setState({ completed: false });
  });

  it('renders every slide with its illustration, title and pager', async () => {
    await renderOnboarding();
    for (const { key } of ONBOARDING_SLIDES) {
      expect(screen.getByTestId(ONBOARDING_TEST_IDS.slide(key))).toBeOnTheScreen();
      expect(
        screen.getByRole('header', { name: i18n.t(`onboarding.slides.${key}.title`) }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('image', { name: i18n.t(`onboarding.slides.${key}.illustration`) }),
      ).toBeOnTheScreen();
    }
    expect(screen.getByLabelText('Slide 1 of 3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
  });

  it('skip completes onboarding and moves to sign-in', async () => {
    await renderOnboarding();
    await fireEvent.press(screen.getByTestId(ONBOARDING_TEST_IDS.skip));
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(replace).toHaveBeenCalledWith('/(public)/sign-in');
  });

  it('walks the slides to permission priming, which finishes without requesting anything', async () => {
    await renderOnboarding();
    const next = screen.getByTestId(ONBOARDING_TEST_IDS.next);
    await fireEvent.press(next);
    expect(screen.getByLabelText('Slide 2 of 3')).toBeOnTheScreen();
    await fireEvent.press(next);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
    await fireEvent.press(next);

    expect(screen.getByTestId(ONBOARDING_TEST_IDS.priming)).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Two permissions, only when needed' }),
    ).toBeOnTheScreen();
    expect(useOnboardingStore.getState().completed).toBe(false);

    await fireEvent.press(screen.getByTestId(ONBOARDING_TEST_IDS.primingContinue));
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(replace).toHaveBeenCalledWith('/(public)/sign-in');
  });
});
