// Database tests (supabase/tests, supabase/functions): plain Node, no jest-expo.
// `npm run db:test` starts an embedded PostgreSQL unless DATABASE_URL is already set.
const { existsSync } = require('node:fs');
const path = require('node:path');

// Jest refuses roots that do not exist yet; supabase/functions appears with the first Edge Function.
const repoRoot = path.dirname(require.resolve('./package.json'));
const roots = ['supabase/tests', 'supabase/functions']
  .filter((dir) => existsSync(path.join(repoRoot, dir)))
  .map((dir) => `<rootDir>/${dir}`);

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'db',
  testEnvironment: 'node',
  roots,
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
  transform: {
    '^.+\\.(ts|js|mjs)$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/supabase/tests/_harness/setup.ts'],
  globalSetup: '<rootDir>/supabase/tests/_harness/globalSetup.mjs',
  globalTeardown: '<rootDir>/supabase/tests/_harness/globalTeardown.mjs',
  // Tests isolate themselves with per-test transactions, so workers share one database.
  maxWorkers: 4,
  testTimeout: 20000,
};
