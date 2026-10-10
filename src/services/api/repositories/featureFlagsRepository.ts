import { z } from 'zod';

import { type FlagKey, type Flags, flagsSchema } from '@/shared/config/featureFlags';

import type { Tables } from '../database.types';
import type { AppSupabaseClient } from '../supabaseClient';

/**
 * Reads `public.feature_flags` (RLS: any authenticated user may select every row) and maps the
 * rows onto the app's flag keys. The table key is snake_case (`payments_payme`); the app key lives
 * in `payload.app_key` (`payments.payme`), see docs/SEED.md.
 *
 * Mapping rules (ADR-031):
 * - boolean app flags take the row's `enabled` column; `payload.value` is ignored for them;
 * - non-boolean app flags (`maps.provider`) take `payload.value`, and only while `enabled` is true;
 *   a disabled row leaves the local default in place;
 * - rows without a known `app_key` (e.g. `no_show_penalty`, a server-side rule) and values that
 *   fail the flag's schema are skipped one by one, so one bad row never hides the others.
 */

/** The slice of the client this repository uses; tests inject a fake. */
export type FeatureFlagsClient = Pick<AppSupabaseClient, 'from' | 'channel' | 'removeChannel'>;

export type FeatureFlagRow = Pick<Tables<'feature_flags'>, 'key' | 'enabled' | 'payload'>;

/** Explicit columns: `audience`/`description` are admin concerns the app does not need. */
export const FEATURE_FLAG_COLUMNS = 'key, enabled, payload';

export const FEATURE_FLAGS_CHANNEL = 'app:feature_flags';

export class FeatureFlagsFetchError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(`feature_flags fetch failed: ${message}`);
    this.name = 'FeatureFlagsFetchError';
    this.code = code;
  }
}

const rowSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
});

export async function fetchFeatureFlagRows(client: FeatureFlagsClient): Promise<FeatureFlagRow[]> {
  const { data, error } = await client.from('feature_flags').select(FEATURE_FLAG_COLUMNS);
  if (error) throw new FeatureFlagsFetchError(error.message, error.code);
  return data ?? [];
}

function isFlagKey(value: unknown): value is FlagKey {
  return typeof value === 'string' && Object.hasOwn(flagsSchema.shape, value);
}

/** Validates each row at the boundary and returns only the flags it could map. */
export function flagsFromRows(rows: readonly unknown[]): Partial<Flags> {
  const flags: Partial<Record<FlagKey, unknown>> = {};
  for (const raw of rows) {
    const row = rowSchema.safeParse(raw);
    if (!row.success) continue;
    const appKey = row.data.payload.app_key;
    if (!isFlagKey(appKey)) continue;
    const schema = flagsSchema.shape[appKey];
    const isBoolean = schema instanceof z.ZodBoolean;
    if (!isBoolean && !row.data.enabled) continue;
    const parsed = schema.safeParse(isBoolean ? row.data.enabled : row.data.payload.value);
    if (parsed.success) flags[appKey] = parsed.data;
  }
  return flags as Partial<Flags>;
}

/**
 * Calls `onChange` on every insert/update/delete of `feature_flags` (Supabase Realtime
 * `postgres_changes`; the table is in the `supabase_realtime` publication via migration 0010).
 * When Realtime is unavailable (channel error or timeout) the channel is removed instead of
 * retrying forever; the next sign-in or app start fetches the flags again.
 * Returns an idempotent unsubscribe.
 */
export function subscribeToFeatureFlagChanges(
  client: FeatureFlagsClient,
  onChange: () => void,
): () => void {
  let removed = false;
  const channel = client.channel(FEATURE_FLAGS_CHANNEL);
  const remove = () => {
    if (removed) return;
    removed = true;
    void client.removeChannel(channel).catch(() => undefined);
  };
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_flags' }, () => {
      if (!removed) onChange();
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') remove();
    });
  return remove;
}
