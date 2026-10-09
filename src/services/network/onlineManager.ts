import { onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';

/** Unknown fields are treated optimistically: only a confirmed "no" counts as offline. */
export function isNetworkOnline(state: NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

/**
 * Feeds expo-network into TanStack Query's `onlineManager` so queries and mutations pause while
 * offline and resume when connectivity returns. Returns a teardown that stops listening.
 */
export function connectOnlineManager(): () => void {
  let subscription: { remove(): void } | undefined;

  onlineManager.setEventListener((setOnline) => {
    let active = true;
    getNetworkStateAsync()
      .then((state) => {
        if (active) setOnline(isNetworkOnline(state));
      })
      .catch(() => {
        // Keep the optimistic default when the native module cannot answer.
      });
    subscription = addNetworkStateListener((state) => setOnline(isNetworkOnline(state)));
    return () => {
      active = false;
      subscription?.remove();
      subscription = undefined;
    };
  });

  return () => {
    subscription?.remove();
    subscription = undefined;
  };
}
