/**
 * Jest manual mock for `lucide-react-native` (auto-applied: Jest picks up `__mocks__/<package>`
 * found under any configured root). The package's `react-native` export condition points at an
 * untransformed `.mjs` bundle, while jest-expo only transforms `.[jt]sx?` files, so the real
 * entry cannot be parsed. This swaps in the identical CommonJS build. Absolute path because the
 * package `exports` map does not expose `dist/cjs`.
 *
 * Remove once `jest.config.js` maps `^lucide-react-native$` to the CJS entry via moduleNameMapper.
 */
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const CJS_ENTRY = path.join(
  REPO_ROOT,
  'node_modules',
  'lucide-react-native',
  'dist',
  'cjs',
  'lucide-react-native.js',
);

module.exports = jest.requireActual(CJS_ENTRY);
