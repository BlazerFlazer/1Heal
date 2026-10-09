import { z } from 'zod';

import { createJsonStorage, createMemoryBackend, type KeyValueBackend } from './jsonStorage';

const profileSchema = z.object({ name: z.string(), visits: z.number().int() });

function spyBackend(): KeyValueBackend & { keys(): string[] } {
  const map = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => Promise.resolve(map.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      map.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      map.delete(key);
      return Promise.resolve();
    }),
    keys: () => [...map.keys()],
  };
}

describe('createJsonStorage', () => {
  it('round-trips JSON values through a backend', async () => {
    const storage = createJsonStorage(createMemoryBackend());
    await storage.setJson('profile', { name: 'Aziz', visits: 3 });
    await expect(storage.getJson('profile', profileSchema)).resolves.toEqual({
      name: 'Aziz',
      visits: 3,
    });
  });

  it('returns null for missing keys', async () => {
    const storage = createJsonStorage(createMemoryBackend());
    await expect(storage.getJson('missing', profileSchema)).resolves.toBeNull();
  });

  it('drops values that fail the schema and removes them', async () => {
    const backend = spyBackend();
    const storage = createJsonStorage(backend);
    await backend.setItem('profile', JSON.stringify({ name: 42 }));
    await expect(storage.getJson('profile', profileSchema)).resolves.toBeNull();
    expect(backend.keys()).toEqual([]);
  });

  it('drops corrupt JSON and removes it', async () => {
    const backend = spyBackend();
    const storage = createJsonStorage(backend);
    await backend.setItem('profile', '{not json');
    await expect(storage.getJson('profile', profileSchema)).resolves.toBeNull();
    expect(backend.keys()).toEqual([]);
  });

  it('rejects values that are not JSON-serializable', async () => {
    const storage = createJsonStorage(createMemoryBackend());
    await expect(storage.setJson('fn', () => 1)).rejects.toThrow(TypeError);
  });

  describe('chunking', () => {
    const bigSchema = z.object({ text: z.string() });
    const bigValue = { text: 'Ташкент 🏋️ '.repeat(400) };

    it('splits oversized values into chunks and reassembles them', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 2048 });
      await storage.setJson('big', bigValue);
      expect(backend.keys().length).toBeGreaterThan(2);
      expect(backend.keys()).toContain('big.chunk0');
      await expect(storage.getJson('big', bigSchema)).resolves.toEqual(bigValue);
    });

    it('keeps every stored chunk within the byte budget', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 2048 });
      await storage.setJson('big', bigValue);
      const setItem = backend.setItem as jest.Mock;
      for (const [, value] of setItem.mock.calls as [string, string][]) {
        expect(Buffer.byteLength(value, 'utf8')).toBeLessThanOrEqual(2048);
      }
    });

    it('does not chunk values that fit', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 2048 });
      await storage.setJson('small', { text: 'ok' });
      expect(backend.keys()).toEqual(['small']);
    });

    it('removes stale chunks when a smaller value overwrites a chunked one', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 2048 });
      await storage.setJson('big', bigValue);
      await storage.setJson('big', { text: 'tiny' });
      expect(backend.keys()).toEqual(['big']);
      await expect(storage.getJson('big', bigSchema)).resolves.toEqual({ text: 'tiny' });
    });

    it('removes surplus chunks when a shorter chunked value replaces a longer one', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 64 });
      await storage.setJson('big', { text: 'a'.repeat(1000) });
      const before = backend.keys().length;
      await storage.setJson('big', { text: 'b'.repeat(200) });
      expect(backend.keys().length).toBeLessThan(before);
      await expect(storage.getJson('big', bigSchema)).resolves.toEqual({ text: 'b'.repeat(200) });
    });

    it('remove() deletes the head and every chunk', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 2048 });
      await storage.setJson('big', bigValue);
      await storage.remove('big');
      expect(backend.keys()).toEqual([]);
    });

    it('returns null when a chunk is missing', async () => {
      const backend = spyBackend();
      const storage = createJsonStorage(backend, { maxValueBytes: 2048 });
      await storage.setJson('big', bigValue);
      await backend.removeItem('big.chunk1');
      await expect(storage.getJson('big', bigSchema)).resolves.toBeNull();
    });
  });
});
