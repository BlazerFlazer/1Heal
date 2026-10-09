import { renderHook } from '@testing-library/react-native';
import * as Network from 'expo-network';

import { toNetworkStatus, useNetworkStatus } from './useNetworkStatus';

jest.mock('expo-network', () => ({
  useNetworkState: jest.fn(),
}));

const useNetworkState = Network.useNetworkState as jest.Mock;

describe('toNetworkStatus', () => {
  it('reports unknown until native answers', () => {
    expect(toNetworkStatus({})).toEqual({ isOnline: null, isInternetReachable: null });
  });

  it('is online only when connected and internet is not confirmed unreachable', () => {
    expect(toNetworkStatus({ isConnected: true, isInternetReachable: true })).toEqual({
      isOnline: true,
      isInternetReachable: true,
    });
    expect(toNetworkStatus({ isConnected: true })).toEqual({
      isOnline: true,
      isInternetReachable: null,
    });
    expect(toNetworkStatus({ isConnected: true, isInternetReachable: false })).toEqual({
      isOnline: false,
      isInternetReachable: false,
    });
    expect(toNetworkStatus({ isConnected: false, isInternetReachable: false })).toEqual({
      isOnline: false,
      isInternetReachable: false,
    });
  });
});

describe('useNetworkStatus', () => {
  it('maps the expo-network hook state', async () => {
    useNetworkState.mockReturnValue({ isConnected: false, isInternetReachable: false });
    const { result } = await renderHook(() => useNetworkStatus());
    expect(result.current).toEqual({ isOnline: false, isInternetReachable: false });
  });
});
