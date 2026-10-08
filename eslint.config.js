// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

const FEATURES = [
  'auth',
  'onboarding',
  'home',
  'discover',
  'venue',
  'booking',
  'checkin',
  'subscription',
  'payments',
  'profile',
  'reviews',
  'partner',
];

// A feature may import only its own files, src/shared, src/services and src/domain.
const featureBoundaries = FEATURES.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: FEATURES.filter((other) => other !== feature).map((other) => ({
          group: [`@/features/${other}/*`, `**/features/${other}/*`],
          message: `Feature "${feature}" must not import from feature "${other}". Share code through src/shared, src/services or src/domain.`,
        })),
      },
    ],
  },
}));

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: [
      'dist/*',
      'coverage/*',
      'apps/**',
      'supabase/**',
      'e2e/**',
      '.expo/**',
      'expo-env.d.ts',
      'android/**',
      'ios/**',
    ],
  },
  {
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use the @/ alias instead of deep relative imports.',
            },
          ],
        },
      ],
    },
  },
  ...featureBoundaries,
  {
    // Routes are thin: they may import features, shared, services.
    files: ['app/**/*.{ts,tsx}'],
    rules: {},
  },
]);
