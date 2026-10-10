/**
 * SQL literal rendering for the generated seed. Values are always rendered as literals (the seed
 * is a static file, there are no parameters); strings are quoted with doubled single quotes, which
 * is safe with standard_conforming_strings = on (the default on both targets).
 *
 * In `insert ... values` Postgres coerces each literal to its target column type, so inserts are
 * written without casts. `(values ...)` lists used by `update ... from` carry explicit casts.
 */
import { isoLocal } from './time.mjs';

export function str(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

const isNull = (value) => value === null || value === undefined;
const cast = (sql, type, typed) => (typed && sql !== 'null' ? `${sql}::${type}` : sql);

const RENDER = {
  str: (v) => str(v),
  num: (v) => (isNull(v) ? 'null' : String(v)),
  bool: (v) => (isNull(v) ? 'null' : v ? 'true' : 'false'),
  json: (v, typed) => cast(isNull(v) ? 'null' : str(JSON.stringify(v)), 'jsonb', typed),
  ts: (v, typed) => cast(isNull(v) ? 'null' : str(isoLocal(v)), 'timestamptz', typed),
  uuid: (v, typed) => cast(str(v), 'uuid', typed),
  textArray: (v) => (v.length === 0 ? `'{}'::text[]` : `array[${v.map(str).join(', ')}]::text[]`),
  uuidArray: (v) => (v.length === 0 ? `'{}'::uuid[]` : `array[${v.map(str).join(', ')}]::uuid[]`),
};

const camel = (name) => name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

/**
 * Column specs from "name:kind, name:kind, ...". Each column reads row[camelCase(name)] unless
 * `get` has an accessor for it, e.g. columns('id:uuid, venue_id:uuid', { id: (r) => r.key }).
 */
export function columns(spec, get = {}) {
  return spec
    .trim()
    .split(/\s*,\s*/)
    .map((entry) => {
      const [name, kind] = entry.split(':');
      if (!RENDER[kind]) throw new Error(`columns: unknown kind in "${entry}"`);
      const key = camel(name);
      return [name, kind, get[name] ?? ((item) => item[key])];
    });
}

const row = (columns, item, typed) =>
  `  (${columns.map(([, kind, get]) => RENDER[kind](get(item), typed)).join(', ')})`;

/**
 * `insert into <table> (...) values (...), ... on conflict do nothing;` in chunks.
 * columns: [[columnName, kind, (row) => value], ...], kind is a key of RENDER.
 */
export function insertRows(table, columns, rows, { chunk = 300 } = {}) {
  if (rows.length === 0) return `-- ${table}: no rows\n`;
  const names = columns.map(([name]) => name).join(', ');
  const statements = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const values = rows.slice(i, i + chunk).map((item) => row(columns, item, false));
    statements.push(
      `insert into ${table} (${names}) values\n${values.join(',\n')}\non conflict do nothing;\n`,
    );
  }
  return statements.join('');
}

/** A `(values ...)` list for `update ... from`, every value rendered with its cast. */
export function valuesList(columns, rows) {
  return rows.map((item) => row(columns, item, true)).join(',\n');
}
