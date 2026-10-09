import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager, type Query, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { Text } from 'react-native';

import { createQueryClient } from './queryClient';
import { QUERY_CACHE_BUSTER, QueryProvider, shouldPersistQuery } from './QueryProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(),
}));

const getNetworkStateAsync = Network.getNetworkStateAsync as jest.Mock;
const addNetworkStateListener = Network.addNetworkStateListener as jest.Mock;

function Greeting() {
  const { data } = useQuery({ queryKey: ['greeting'], queryFn: () => Promise.resolve('salom') });
  return <Text>{data ?? 'loading'}</Text>;
}

describe('QueryProvider', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    getNetworkStateAsync.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    addNetworkStateListener.mockReturnValue({ remove: jest.fn() });
  });

  it('renders children and serves queries', async () => {
    await render(
      <QueryProvider>
        <Text>child</Text>
        <Greeting />
      </QueryProvider>,
    );
    expect(screen.getByText('child')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('salom')).toBeTruthy());
  });

  it('wires the online manager to expo-network', async () => {
    await render(
      <QueryProvider client={createQueryClient()}>
        <Greeting />
      </QueryProvider>,
    );
    await waitFor(() => expect(addNetworkStateListener).toHaveBeenCalled());
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('persists only successful queries', () => {
    const success = { state: { status: 'success' } } as Query;
    const error = { state: { status: 'error' } } as Query;
    expect(shouldPersistQuery(success)).toBe(true);
    expect(shouldPersistQuery(error)).toBe(false);
    expect(typeof QUERY_CACHE_BUSTER).toBe('string');
  });
});
