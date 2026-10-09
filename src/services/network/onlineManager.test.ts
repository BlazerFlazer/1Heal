import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

import { connectOnlineManager, isNetworkOnline } from './onlineManager';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(),
}));

const getNetworkStateAsync = Network.getNetworkStateAsync as jest.Mock;
const addNetworkStateListener = Network.addNetworkStateListener as jest.Mock;

describe('isNetworkOnline', () => {
  it('treats unknown fields as online and confirmed negatives as offline', () => {
    expect(isNetworkOnline({})).toBe(true);
    expect(isNetworkOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(isNetworkOnline({ isConnected: true, isInternetReachable: undefined })).toBe(true);
    expect(isNetworkOnline({ isConnected: false })).toBe(false);
    expect(isNetworkOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });
});

describe('connectOnlineManager', () => {
  let listener: ((state: Network.NetworkState) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    listener = undefined;
    getNetworkStateAsync.mockResolvedValue({ isConnected: true, isInternetReachable: true });
    addNetworkStateListener.mockImplementation((cb: (state: Network.NetworkState) => void) => {
      listener = cb;
      return { remove };
    });
  });

  it('drives onlineManager from expo-network once something subscribes', async () => {
    const teardown = connectOnlineManager();
    const unsubscribe = onlineManager.subscribe(() => undefined);
    await Promise.resolve();
    expect(getNetworkStateAsync).toHaveBeenCalled();
    expect(onlineManager.isOnline()).toBe(true);

    listener?.({ isConnected: false });
    expect(onlineManager.isOnline()).toBe(false);

    listener?.({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);

    unsubscribe();
    teardown();
    expect(remove).toHaveBeenCalled();
  });

  it('uses the initial async state', async () => {
    getNetworkStateAsync.mockResolvedValue({ isConnected: false });
    const teardown = connectOnlineManager();
    const unsubscribe = onlineManager.subscribe(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    expect(onlineManager.isOnline()).toBe(false);
    unsubscribe();
    teardown();
    onlineManager.setOnline(true);
  });
});
