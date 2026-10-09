import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { APP_KEYS } from '@/services/storage/storageKeys';

import type { AuthService, AuthStateListener } from './AuthService';
import { selectHasRole, selectIsSignedIn, useAuthBootstrap, useAuthStore } from './authStore';
import type { Session } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./index', () => ({ getAuthService: jest.fn() }));

const memberSession: Session = {
  userId: 'u1',
  phoneE164: '+998901234567',
  accessToken: 'a',
  refreshToken: 'r',
  expiresAt: '2030-01-01T00:00:00.000Z',
  roles: ['member'],
  deviceId: 'device-1',
  profile: {},
};
const partnerSession: Session = { ...memberSession, roles: ['member', 'partner'] };

function fakeService(restored: Session | null) {
  const listeners = new Set<AuthStateListener>();
  const service: AuthService = {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    restoreSession: jest.fn(() => Promise.resolve(restored)),
    refreshSession: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn((listener: AuthStateListener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };
  return {
    service,
    emit: (session: Session | null) => {
      for (const listener of listeners) listener(session);
    },
    listenerCount: () => listeners.size,
  };
}

describe('useAuthStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAuthStore.setState({ status: 'bootstrapping', session: null, activeMode: 'member' });
  });

  it('starts bootstrapping with no session', () => {
    expect(useAuthStore.getState()).toMatchObject({
      status: 'bootstrapping',
      session: null,
      activeMode: 'member',
    });
    expect(selectIsSignedIn(useAuthStore.getState())).toBe(false);
  });

  it('setSession toggles between signed in and signed out', () => {
    useAuthStore.getState().setSession(memberSession);
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(selectHasRole('member')(useAuthStore.getState())).toBe(true);
    expect(selectHasRole('partner')(useAuthStore.getState())).toBe(false);

    useAuthStore.getState().setSession(null);
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('only partners can enter partner mode, and the choice is persisted', async () => {
    useAuthStore.getState().setSession(memberSession);
    useAuthStore.getState().setActiveMode('partner');
    expect(useAuthStore.getState().activeMode).toBe('member');

    useAuthStore.getState().setSession(partnerSession);
    useAuthStore.getState().setActiveMode('partner');
    expect(useAuthStore.getState().activeMode).toBe('partner');
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(APP_KEYS.activeMode)).toBe(JSON.stringify('partner')),
    );
  });

  it('falls back to member mode when the partner role disappears', async () => {
    useAuthStore.getState().setSession(partnerSession);
    useAuthStore.getState().setActiveMode('partner');
    useAuthStore.getState().setSession(memberSession);
    expect(useAuthStore.getState().activeMode).toBe('member');
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(APP_KEYS.activeMode)).toBe(JSON.stringify('member')),
    );
  });

  it('clear() signs out and forgets the mode', async () => {
    useAuthStore.getState().setSession(partnerSession);
    useAuthStore.getState().setActiveMode('partner');
    useAuthStore.getState().clear();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedOut',
      session: null,
      activeMode: 'member',
    });
    await waitFor(async () => expect(await AsyncStorage.getItem(APP_KEYS.activeMode)).toBeNull());
  });
});

describe('useAuthBootstrap', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAuthStore.setState({ status: 'bootstrapping', session: null, activeMode: 'member' });
  });

  it('restores the session and the stored partner mode', async () => {
    await AsyncStorage.setItem(APP_KEYS.activeMode, JSON.stringify('partner'));
    const { service } = fakeService(partnerSession);
    const { result } = await renderHook(() => useAuthBootstrap(service));
    await waitFor(() => expect(result.current).toBe('signedIn'));
    expect(service.restoreSession).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().activeMode).toBe('partner');
  });

  it('ignores a stored partner mode for members and signs out when nothing is restored', async () => {
    await AsyncStorage.setItem(APP_KEYS.activeMode, JSON.stringify('partner'));
    const { service } = fakeService(null);
    const { result } = await renderHook(() => useAuthBootstrap(service));
    await waitFor(() => expect(result.current).toBe('signedOut'));
    expect(useAuthStore.getState().activeMode).toBe('member');
  });

  it('follows auth events until unmount', async () => {
    const fake = fakeService(memberSession);
    const { result, unmount } = await renderHook(() => useAuthBootstrap(fake.service));
    await waitFor(() => expect(result.current).toBe('signedIn'));

    await act(async () => fake.emit(null));
    expect(result.current).toBe('signedOut');

    await unmount();
    expect(fake.listenerCount()).toBe(0);
  });

  it('treats a failing restore as signed out', async () => {
    const fake = fakeService(null);
    (fake.service.restoreSession as jest.Mock).mockRejectedValue(new Error('keychain'));
    const { result } = await renderHook(() => useAuthBootstrap(fake.service));
    await waitFor(() => expect(result.current).toBe('signedOut'));
  });
});
