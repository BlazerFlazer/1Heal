import { z } from 'zod';

import { createJsonStorage, createMemoryBackend } from '@/services/storage/jsonStorage';
import { SECURE_KEYS } from '@/services/storage/storageKeys';

import { generateDeviceId, getOrCreateDeviceId } from './deviceId';

describe('generateDeviceId', () => {
  it('produces distinct, non-trivial ids', () => {
    const first = generateDeviceId();
    const second = generateDeviceId();
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(first).not.toBe(second);
  });
});

describe('getOrCreateDeviceId', () => {
  it('creates an id once and returns the same one afterwards', async () => {
    const storage = createJsonStorage(createMemoryBackend());
    const first = await getOrCreateDeviceId(storage);
    const second = await getOrCreateDeviceId(storage);
    expect(second).toBe(first);
    await expect(storage.getJson(SECURE_KEYS.deviceId, z.string())).resolves.toBe(first);
  });

  it('reuses a stored id', async () => {
    const storage = createJsonStorage(createMemoryBackend());
    await storage.setJson(SECURE_KEYS.deviceId, 'device-from-storage');
    await expect(getOrCreateDeviceId(storage)).resolves.toBe('device-from-storage');
  });

  it('replaces a stored id that fails validation', async () => {
    const storage = createJsonStorage(createMemoryBackend());
    await storage.setJson(SECURE_KEYS.deviceId, 'x');
    const created = await getOrCreateDeviceId(storage);
    expect(created).not.toBe('x');
    await expect(storage.getJson(SECURE_KEYS.deviceId, z.string())).resolves.toBe(created);
  });
});
