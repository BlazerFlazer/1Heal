import { type NetworkState, useNetworkState } from 'expo-network';

export interface NetworkStatus {
  /** `null` until the first native answer arrives (treat as "unknown", not offline). */
  isOnline: boolean | null;
  isInternetReachable: boolean | null;
}

export function toNetworkStatus(state: NetworkState): NetworkStatus {
  const isConnected = state.isConnected ?? null;
  const isInternetReachable = state.isInternetReachable ?? null;
  const isOnline = isConnected === null ? null : isConnected && isInternetReachable !== false;
  return { isOnline, isInternetReachable };
}

/** Connectivity for screens: offline banners, disabled submit buttons, cached-data hints. */
export function useNetworkStatus(): NetworkStatus {
  return toNetworkStatus(useNetworkState());
}
