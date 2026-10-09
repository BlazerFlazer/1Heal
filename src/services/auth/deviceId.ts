import { z } from 'zod';

import type { JsonStorage } from '@/services/storage/jsonStorage';
import { SECURE_KEYS } from '@/services/storage/storageKeys';

const deviceIdSchema = z.string().min(8);

/** Random, opaque installation id. `crypto.randomUUID` is used where the runtime provides it. */
export function generateDeviceId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  const time = Date.now().toString(16);
  const entropy = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0'),
  ).join('');
  return `${time}-${entropy}`;
}

/**
 * The id is generated once per installation and kept in secure storage, so it survives
 * sign-out and identifies the device in the `devices` table and in QR tokens.
 */
export async function getOrCreateDeviceId(storage: JsonStorage): Promise<string> {
  const existing = await storage.getJson(SECURE_KEYS.deviceId, deviceIdSchema);
  if (existing !== null) return existing;
  const created = generateDeviceId();
  await storage.setJson(SECURE_KEYS.deviceId, created);
  return created;
}
