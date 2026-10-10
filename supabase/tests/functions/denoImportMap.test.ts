/**
 * Keeps the Edge Function sources loadable by Deno and by Jest at the same time. The modules use
 * extensionless relative imports (what tsc and Jest resolve); Deno resolves them through the exact
 * entries of supabase/functions/deno.json. Also guards the rule that only the function entry files
 * touch Deno: everything under _shared must run unchanged in Node.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const FUNCTIONS_DIR = path.resolve(__dirname, '../../functions');
const SHARED_DIR = path.join(FUNCTIONS_DIR, '_shared');

/** `... from './x'`, `import './x'` and `import('./x')`; `form.set('from', ...)` does not match. */
const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTs(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(SPECIFIER)].map((match) => match[1] ?? '');
}

/** "./_shared/log" for supabase/functions/_shared/log(.ts), the form of the deno.json keys. */
function mapKey(absoluteWithoutExtension: string): string {
  return `./${path.relative(FUNCTIONS_DIR, absoluteWithoutExtension).split(path.sep).join('/')}`;
}

const denoJson = JSON.parse(readFileSync(path.join(FUNCTIONS_DIR, 'deno.json'), 'utf8')) as {
  imports?: Record<string, string>;
};
const imports = denoJson.imports ?? {};
const sources = listTs(FUNCTIONS_DIR);
const sharedSources = listTs(SHARED_DIR);

describe('supabase/functions/deno.json', () => {
  test('every relative import of every function module is mapped to an existing .ts file', () => {
    const problems: string[] = [];
    let checked = 0;
    for (const file of sources) {
      for (const specifier of specifiersOf(file)) {
        if (!specifier.startsWith('.')) continue;
        checked += 1;
        const target = path.resolve(path.dirname(file), specifier);
        if (specifier.endsWith('.ts')) {
          if (!existsSync(target)) problems.push(`${file}: ${specifier} does not exist`);
          continue;
        }
        const key = mapKey(target);
        if (imports[key] !== `${key}.ts`) problems.push(`${file}: ${specifier} needs "${key}"`);
        if (!existsSync(`${target}.ts`)) problems.push(`${file}: ${specifier}.ts does not exist`);
      }
    }
    expect(problems).toEqual([]);
    // Guards against a regex that silently matches nothing (the sources hold ~30 relative imports).
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  test('has one entry per _shared module and no stale entries', () => {
    const expected = sharedSources.map((file) => mapKey(file.replace(/\.ts$/, ''))).sort();
    expect(Object.keys(imports).sort()).toEqual(expected);
    for (const [key, value] of Object.entries(imports)) {
      expect(value).toBe(`${key}.ts`);
    }
  });
});

describe('_shared modules are runtime agnostic', () => {
  test.each(sharedSources.map((file) => [path.relative(FUNCTIONS_DIR, file), file]))(
    '%s uses no Deno globals and no remote or npm specifiers',
    (_name, file) => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/\bDeno\./);
      for (const specifier of specifiersOf(file)) {
        expect(specifier.startsWith('.')).toBe(true);
      }
    },
  );
});
