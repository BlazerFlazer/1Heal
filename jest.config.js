/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-worklets/jest/resolver',
  roots: ['<rootDir>/src', '<rootDir>/app'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|lucide-react-native|@shopify/flash-list)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__fixtures__/**',
    '!src/services/api/database.types.ts',
  ],
  coverageReporters: ['text-summary', 'lcov'],
};
