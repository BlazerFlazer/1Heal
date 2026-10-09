import type { ZodType } from 'zod';

import { splitByUtf8Bytes, utf8ByteLength } from './chunking';

/** Minimal async key-value backend (expo-secure-store, AsyncStorage, localStorage, memory). */
export interface KeyValueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Typed JSON storage: every read is validated with zod, every write is serialized. */
export interface JsonStorage {
  /** Returns `null` when the key is missing or the stored value fails `schema` (it is then removed). */
  getJson<T>(key: string, schema: ZodType<T>): Promise<T | null>;
  setJson<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface JsonStorageOptions {
  /** Values above this UTF-8 size are split into `key.chunkN` entries. Unlimited when omitted. */
  maxValueBytes?: number;
}

/** A serialized JSON document never starts with `_`, so this prefix is unambiguous. */
const CHUNK_HEADER = '__chunked__:';

function chunkKey(key: string, index: number): string {
  return `${key}.chunk${index}`;
}

function parseChunkCount(head: string | null): number {
  if (head === null || !head.startsWith(CHUNK_HEADER)) return 0;
  const count = Number.parseInt(head.slice(CHUNK_HEADER.length), 10);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

export function createJsonStorage(
  backend: KeyValueBackend,
  options: JsonStorageOptions = {},
): JsonStorage {
  const { maxValueBytes } = options;

  async function readRaw(key: string): Promise<string | null> {
    const head = await backend.getItem(key);
    if (head === null) return null;
    const count = parseChunkCount(head);
    if (count === 0) return head.startsWith(CHUNK_HEADER) ? null : head;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, index) => backend.getItem(chunkKey(key, index))),
    );
    return parts.every((part): part is string => part !== null) ? parts.join('') : null;
  }

  async function removeChunks(key: string, from: number, to: number): Promise<void> {
    const removals: Promise<void>[] = [];
    for (let index = from; index < to; index += 1) {
      removals.push(backend.removeItem(chunkKey(key, index)));
    }
    await Promise.all(removals);
  }

  async function remove(key: string): Promise<void> {
    const previousChunks = parseChunkCount(await backend.getItem(key));
    await backend.removeItem(key);
    await removeChunks(key, 0, previousChunks);
  }

  async function setJson<T>(key: string, value: T): Promise<void> {
    const serialized: string | undefined = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError(`Value for "${key}" is not JSON-serializable`);
    }
    const previousChunks = parseChunkCount(await backend.getItem(key));
    let writtenChunks = 0;
    if (maxValueBytes === undefined || utf8ByteLength(serialized) <= maxValueBytes) {
      await backend.setItem(key, serialized);
    } else {
      const chunks = splitByUtf8Bytes(serialized, maxValueBytes);
      await Promise.all(chunks.map((chunk, index) => backend.setItem(chunkKey(key, index), chunk)));
      await backend.setItem(key, `${CHUNK_HEADER}${chunks.length}`);
      writtenChunks = chunks.length;
    }
    await removeChunks(key, writtenChunks, previousChunks);
  }

  async function getJson<T>(key: string, schema: ZodType<T>): Promise<T | null> {
    const raw = await readRaw(key);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await remove(key);
      return null;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      await remove(key);
      return null;
    }
    return result.data;
  }

  return { getJson, setJson, remove };
}

/** In-memory backend: tests, and the web fallback when `localStorage` is unavailable. */
export function createMemoryBackend(initial: Record<string, string> = {}): KeyValueBackend {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
}
