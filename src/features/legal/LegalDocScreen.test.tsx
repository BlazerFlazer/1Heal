import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { BRAND_NAME } from '@/shared/config/brand';
import { i18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

import { LEGAL_DOCS, parseLegalDoc } from './legalDocs';
import { LegalDocScreen } from './LegalDocScreen';
import { LEGAL_TEST_IDS } from './testIds';

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

function renderDoc(doc: unknown) {
  return render(
    <ThemeProvider scheme="light">
      <LegalDocScreen doc={doc} />
    </ThemeProvider>,
  );
}

describe('parseLegalDoc', () => {
  it('accepts only the known slugs', () => {
    for (const doc of LEGAL_DOCS) {
      expect(parseLegalDoc(doc)).toBe(doc);
    }
    expect(parseLegalDoc('Terms')).toBeNull();
    expect(parseLegalDoc(['terms'])).toBeNull();
    expect(parseLegalDoc(undefined)).toBeNull();
  });
});

describe('LegalDocScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(LEGAL_DOCS)(
    'renders the %s document with the draft banner and six sections',
    async (doc) => {
      await renderDoc(doc);
      expect(
        screen.getByRole('header', { name: i18n.t(`legal.docs.${doc}.title`) }),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(LEGAL_TEST_IDS.banner)).toHaveAccessibleName(
        'Draft — to be reviewed by legal counsel before publication.',
      );
      for (let index = 0; index < 6; index += 1) {
        expect(screen.getByTestId(LEGAL_TEST_IDS.section(index))).toBeOnTheScreen();
      }
      expect(screen.getByRole('header', { name: '1. Definitions' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: '6. Contacts' })).toBeOnTheScreen();
      expect(screen.getByTestId(LEGAL_TEST_IDS.section(0))).toHaveTextContent(
        new RegExp(BRAND_NAME),
      );
    },
  );

  it('shows the not-found state for an unknown slug and goes back', async () => {
    await renderDoc('cookies');
    expect(screen.getByText('Document not found')).toBeOnTheScreen();
    expect(screen.queryByTestId(LEGAL_TEST_IDS.banner)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('falls back to sign-in when there is no history to go back to', async () => {
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await renderDoc('privacy');
    await fireEvent.press(screen.getByTestId(LEGAL_TEST_IDS.back));
    expect(router.replace).toHaveBeenCalledWith('/(public)/sign-in');
  });
});
