/** Stable ids shared by component tests and the Maestro flows in `e2e/`. */
export const LEGAL_TEST_IDS = {
  screen: 'legal',
  back: 'legal-back',
  banner: 'legal-draft-banner',
  notFound: 'legal-not-found',
  section: (index: number) => `legal-section-${index}`,
} as const;
