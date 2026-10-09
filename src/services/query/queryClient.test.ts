import {
  createQueryClient,
  QUERY_GC_TIME_MS,
  QUERY_RETRY_COUNT,
  QUERY_STALE_TIME_MS,
  queryRetryDelay,
} from './queryClient';

describe('createQueryClient', () => {
  it('applies the offline-first defaults', () => {
    const client = createQueryClient();
    const { queries, mutations } = client.getDefaultOptions();
    expect(queries).toMatchObject({
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_GC_TIME_MS,
      retry: QUERY_RETRY_COUNT,
      networkMode: 'offlineFirst',
    });
    expect(mutations).toMatchObject({ networkMode: 'offlineFirst', retry: 0 });
    expect(QUERY_STALE_TIME_MS).toBe(60_000);
    expect(QUERY_GC_TIME_MS).toBe(86_400_000);
  });

  it('backs off exponentially with a cap', () => {
    expect(queryRetryDelay(0)).toBe(1000);
    expect(queryRetryDelay(1)).toBe(2000);
    expect(queryRetryDelay(2)).toBe(4000);
    expect(queryRetryDelay(10)).toBe(30_000);
  });
});
