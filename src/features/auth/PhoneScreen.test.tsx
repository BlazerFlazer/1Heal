import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { router } from 'expo-router';

import { AuthError, type OtpRequestResult } from '@/services/auth';
import { i18n } from '@/shared/i18n';

import { PhoneScreen } from './PhoneScreen';
import { AUTH_TEST_IDS } from './testIds';
import { createAuthServiceMock, renderWithProviders } from './testUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);
jest.mock('react-native-gesture-handler', () =>
  jest.requireActual('@/shared/ui/gallery/testing/gestureHandlerMock').createGestureHandlerMock(),
);
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/shared/theme/haptics', () => ({
  haptics: {
    selection: jest.fn(async () => undefined),
    light: jest.fn(async () => undefined),
    medium: jest.fn(async () => undefined),
    success: jest.fn(async () => undefined),
    warning: jest.fn(async () => undefined),
    error: jest.fn(async () => undefined),
  },
}));
jest.mock('react-native-reanimated', () => {
  const actual =
    jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { __esModule: true, ...actual, useReducedMotion: jest.fn(() => false) };
});

const mockAuthService = createAuthServiceMock();
jest.mock('@/services/auth', () => ({
  ...jest.requireActual<typeof import('@/services/auth')>('@/services/auth'),
  getAuthService: () => mockAuthService,
}));

const useNetworkState = jest.mocked(Network.useNetworkState);
const push = jest.mocked(router.push);
const E164 = '+998901234567';
const otpResult: OtpRequestResult = {
  resendAfterSec: 30,
  expiresInSec: 300,
  maskedPhone: '+998 90 *** ** 67',
};

function setOnline(isOnline: boolean) {
  useNetworkState.mockReturnValue({ isConnected: isOnline, isInternetReachable: isOnline });
}

async function typePhone(text: string) {
  const input = screen.getByTestId(AUTH_TEST_IDS.phoneInput);
  await fireEvent.changeText(input, text);
  return input;
}

async function submit() {
  await fireEvent.press(screen.getByTestId(AUTH_TEST_IDS.phoneSubmit));
}

describe('PhoneScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setOnline(true);
  });

  it('masks the number progressively and clears when the prefix is deleted', async () => {
    await renderWithProviders(<PhoneScreen />);
    const input = await typePhone('90123');
    expect(input.props.value).toBe('+998 90 123');
    await fireEvent.changeText(input, '+998 90 123 45 67 8');
    expect(input.props.value).toBe('+998 90 123 45 67');
    await fireEvent.changeText(input, '+99');
    expect(input.props.value).toBe('');
    expect(input.props.placeholder).toBe('+998 __ ___ __ __');
  });

  it('rejects an invalid number inline without calling the service', async () => {
    await renderWithProviders(<PhoneScreen />);
    await typePhone('12345');
    await submit();
    expect(await screen.findByText('Check the phone number')).toBeOnTheScreen();
    expect(mockAuthService.requestOtp).not.toHaveBeenCalled();

    await typePhone('901234567');
    await waitFor(() => expect(screen.queryByText('Check the phone number')).toBeNull());
  });

  it('requests a code and opens the verify screen with the resend delay', async () => {
    mockAuthService.requestOtp.mockResolvedValue(otpResult);
    await renderWithProviders(<PhoneScreen />);
    await typePhone('901234567');
    await submit();

    await waitFor(() => expect(mockAuthService.requestOtp).toHaveBeenCalledWith(E164));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith({
        pathname: '/(public)/verify',
        params: { phone: E164, resendAfterSec: '30' },
      }),
    );
  });

  it('shows the retry-after minutes inline for TOO_MANY_REQUESTS', async () => {
    mockAuthService.requestOtp.mockRejectedValue(
      new AuthError('TOO_MANY_REQUESTS', { retryAfterSec: 120 }),
    );
    await renderWithProviders(<PhoneScreen />);
    await typePhone('901234567');
    await submit();

    expect(await screen.findByText('Too many attempts. Try again in 2 min')).toBeOnTheScreen();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows transient failures as a toast', async () => {
    mockAuthService.requestOtp.mockRejectedValue(new AuthError('NETWORK'));
    await renderWithProviders(<PhoneScreen />);
    await typePhone('901234567');
    await submit();

    expect(
      await screen.findByText("Can't reach the server. Check your internet connection."),
    ).toBeOnTheScreen();
  });

  it('disables submit and explains while offline', async () => {
    setOnline(false);
    await renderWithProviders(<PhoneScreen />);
    expect(screen.getByTestId(AUTH_TEST_IDS.phoneSubmit)).toBeDisabled();
    expect(screen.getByText('You need an internet connection to get a code')).toBeOnTheScreen();
    expect(screen.getByText('No connection. Showing saved data.')).toBeOnTheScreen();
  });

  it('links to the terms and the privacy policy', async () => {
    await renderWithProviders(<PhoneScreen />);
    await fireEvent.press(screen.getByRole('link', { name: 'Terms of Service' }));
    expect(push).toHaveBeenLastCalledWith({
      pathname: '/(public)/legal/[doc]',
      params: { doc: 'terms' },
    });
    await fireEvent.press(screen.getByRole('link', { name: 'Privacy Policy' }));
    expect(push).toHaveBeenLastCalledWith({
      pathname: '/(public)/legal/[doc]',
      params: { doc: 'privacy' },
    });
  });
});
