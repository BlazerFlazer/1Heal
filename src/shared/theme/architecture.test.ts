import fs from 'node:fs';
import path from 'node:path';

/**
 * Colors live in `src/shared/theme/tokens.ts` only. This test scans `src` and `app` for
 * hex (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`) and `rgb(` / `rgba(` literals and lists offenders.
 */
const ROOT = path.resolve(__dirname, '..', '..', '..');
const SCAN_DIRS = ['src', 'app'] as const;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TOKENS_FILE = path.join(ROOT, 'src', 'shared', 'theme', 'tokens.ts');
const TEST_FILE = /\.test\.[jt]sx?$/;

const HEX_LITERAL = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
const RGB_LITERAL = /\brgba?\(/g;

function collectSourceFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
      continue;
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name)) || TEST_FILE.test(entry.name)) {
      continue;
    }
    if (full !== TOKENS_FILE) {
      out.push(full);
    }
  }
}

function findColorLiterals(file: string): string[] {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const offenders: string[] = [];
  fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, index) => {
      const hits = [...line.matchAll(HEX_LITERAL), ...line.matchAll(RGB_LITERAL)];
      for (const hit of hits) {
        offenders.push(`${relative}:${index + 1}: ${hit[0]} -> ${line.trim()}`);
      }
    });
  return offenders;
}

describe('architecture: color literals', () => {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    collectSourceFiles(path.join(ROOT, dir), files);
  }

  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files).not.toContain(TOKENS_FILE);
  });

  it('keeps hex and rgb(a) color literals inside src/shared/theme/tokens.ts', () => {
    const offenders = files.flatMap(findColorLiterals);
    expect(offenders).toEqual([]);
  });
});
