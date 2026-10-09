import { QueryClient } from '@tanstack/react-query';

export const QUERY_STALE_TIME_MS = 60_000;
export const QUERY_GC_TIME_MS = 24 * 60 * 60 * 1000;
export const QUERY_RETRY_COUNT = 2;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30_000;

/** Exponential backoff: 1 s, 2 s, 4 s … capped at 30 s. */
export function queryRetryDelay(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
}

/**
 * App-wide query client. `offlineFirst` serves cached data instantly and pauses retries while
 * offline (see `connectOnlineManager`). `gcTime` must be at least the persister's `maxAge`.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        retry: QUERY_RETRY_COUNT,
        retryDelay: queryRetryDelay,
        networkMode: 'offlineFirst',
      },
      mutations: {
        networkMode: 'offlineFirst',
        retry: 0,
      },
    },
  });
}
