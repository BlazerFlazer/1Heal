// https://docs.expo.dev/guides/customizing-metro/
const path = require('path');

const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Sentry serializer adds Debug IDs to bundles and source maps (readable production stack traces).
// Keep the SDK defaults: excluding the web feedback bundle breaks the web preview at import time.
const config = getSentryExpoConfig(__dirname);

/**
 * Blocks one top-level project folder by absolute path. A bare `/supabase\/.*\/` would also match
 * `node_modules/@supabase/supabase-js`, so every pattern is anchored to the project root.
 */
function projectDir(dir) {
  const escaped = path.join(__dirname, dir).replace(/[\^$.*+?()[\]{}|/]/g, '\$&');
  return new RegExp(`^${escaped}[\\/].*$`);
}

// The admin web app and the Supabase (Deno) code are separate packages; never bundle them.
config.resolver.blockList = [
  ...config.resolver.blockList,
  projectDir('apps/admin'),
  projectDir('supabase'),
  projectDir('e2e'),
  projectDir('coverage'),
];

module.exports = config;
