import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query, QueryClient } from '@tanstack/react-query';
import { type Persister, PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { type ReactNode, useEffect, useState } from 'react';

import { connectOnlineManager } from '@/services/network/onlineManager';
import { createQueryClient, QUERY_GC_TIME_MS } from '@/services/query/queryClient';
import { APP_KEYS } from '@/services/storage/storageKeys';

/** A new app version discards the persisted cache so stale shapes never reach new code. */
export const QUERY_CACHE_BUSTER: string = Constants.expoConfig?.version ?? '0';
const PERSIST_THROTTLE_MS = 1000;

export function createQueryPersister(): Persister {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: APP_KEYS.queryCache,
    throttleTime: PERSIST_THROTTLE_MS,
  });
}

/** Only successful queries are worth restoring; errors and pending states are re-fetched. */
export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success';
}

export interface QueryProviderProps {
  children: ReactNode;
  /** Injected in tests; the app creates its own client once. */
  client?: QueryClient;
  persister?: Persister;
}

export function QueryProvider({ children, client, persister }: QueryProviderProps) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  const [queryPersister] = useState(() => persister ?? createQueryPersister());

  useEffect(() => connectOnlineManager(), []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: QUERY_GC_TIME_MS,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
