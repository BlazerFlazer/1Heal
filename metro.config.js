// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// The admin web app and the Supabase (Deno) code are separate packages; never bundle them.
config.resolver.blockList = exclusionList([
  /apps\/admin\/.*/,
  /supabase\/.*/,
  /e2e\/.*/,
  /coverage\/.*/,
]);

module.exports = config;
