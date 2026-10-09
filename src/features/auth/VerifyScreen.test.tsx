import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Reanimated from 'react-native-reanimated';

import { AuthError, MOCK_OTP_CODE, type OtpRequestResult, type Session } from '@/services/auth';
import { useAuthStore } from '@/services/auth/authStore';
import { i18n } from '@/shared/i18n';
import { haptics } from '@/shared/theme/haptics';

import { AUTH_TEST_IDS } from './testIds';
import { createAuthServiceMock, renderWithProviders } from './testUtils';
import { VerifyScreen } from './VerifyScreen';

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
  return {
    __esModule: true,
    ...actual,
    useReducedMotion: jest.fn(() => false),
    withSequence: jest.fn(actual.withSequence),
  };
});

const mockAuthService = createAuthServiceMock();
jest.mock('@/services/auth', () => ({
  ...jest.requireActual<typeof import('@/services/auth')>('@/services/auth'),
  getAuthService: () => mockAuthService,
}));

const withSequence = jest.mocked(Reanimated.withSequence);
const E164 = '+998901234567';
const PARAMS = { phone: E164, resendAfterSec: '30' };
const session: Session = {
  userId: 'mock-998901234567',
  phoneE164: E164,
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: '2026-10-09T11:00:00.000Z',
  roles: ['member'],
  deviceId: 'device',
  profile: {},
};
const otpResult: OtpRequestResult = {
  resendAfterSec: 60,
  expiresInSec: 300,
  maskedPhone: '+998 90 *** ** 67',
};

function renderVerify(params: Record<string, string> = PARAMS) {
  return renderWithProviders(<VerifyScreen params={params} />);
}

function otpInput() {
  return screen.getByTestId(AUTH_TEST_IDS.otpInput);
}

async function typeCode(code: string) {
  await fireEvent.changeText(otpInput(), code);
}

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

describe('VerifyScreen', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'signedOut', session: null, activeMode: 'member' });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the formatted number and submits as soon as the sixth digit lands', async () => {
    mockAuthService.verifyOtp.mockResolvedValue(session);
    await renderVerify();
    expect(screen.getByText('We sent a code to +998 90 123 45 67')).toBeOnTheScreen();

    await typeCode('123456');
    await waitFor(() => expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(E164, '123456'));
    await waitFor(() => expect(useAuthStore.getState().session).toEqual(session));
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(haptics.success).toHaveBeenCalled();
  });

  it('shakes, clears and explains a wrong code, then accepts a new attempt', async () => {
    mockAuthService.verifyOtp.mockRejectedValueOnce(new AuthError('INVALID_CODE'));
    await renderVerify();
    await typeCode('000000');

    expect(await screen.findByText('Wrong code. Check the SMS and try again.')).toBeOnTheScreen();
    expect(otpInput().props.value).toBe('');
    expect(withSequence).toHaveBeenCalled();

    mockAuthService.verifyOtp.mockResolvedValueOnce(session);
    await typeCode('123456');
    expect(screen.queryByText('Wrong code. Check the SMS and try again.')).toBeNull();
    await waitFor(() => expect(mockAuthService.verifyOtp).toHaveBeenLastCalledWith(E164, '123456'));
  });

  it('locks the input until the time the provider gives', async () => {
    jest.setSystemTime(new Date(2026, 9, 9, 10, 0, 0));
    mockAuthService.verifyOtp.mockRejectedValue(new AuthError('LOCKED', { retryAfterSec: 900 }));
    await renderVerify();
    await typeCode('000000');

    expect(await screen.findByText('Sign-in is locked until 10:15')).toBeOnTheScreen();
    expect(
      screen.getByText('Too many wrong attempts. Wait a little and try again.'),
    ).toBeOnTheScreen();
    expect(otpInput().props.editable).toBe(false);

    await advance(900_000);
    expect(screen.queryByTestId(AUTH_TEST_IDS.otpLocked)).toBeNull();
    expect(otpInput().props.editable).toBe(true);
  });

  it('offers resend at once when the code has expired', async () => {
    mockAuthService.verifyOtp.mockRejectedValue(new AuthError('CODE_EXPIRED'));
    await renderVerify();
    expect(screen.getByText('Resend in 0:30')).toBeOnTheScreen();

    await typeCode('000000');
    expect(await screen.findByText('This code has expired. Request a new one.')).toBeOnTheScreen();
    expect(screen.getByText('Resend code')).toBeOnTheScreen();
    expect(screen.getByTestId(AUTH_TEST_IDS.otpResend)).toBeEnabled();
  });

  it('counts the resend delay down, resends, and restarts from the new delay', async () => {
    mockAuthService.requestOtp.mockResolvedValue(otpResult);
    await renderVerify();
    const resend = screen.getByTestId(AUTH_TEST_IDS.otpResend);
    expect(screen.getByText('Resend in 0:30')).toBeOnTheScreen();
    expect(resend).toBeDisabled();

    await advance(29_000);
    expect(screen.getByText('Resend in 0:01')).toBeOnTheScreen();
    await advance(1_000);
    expect(screen.getByText('Resend code')).toBeOnTheScreen();
    expect(resend).toBeEnabled();

    await fireEvent.press(resend);
    await waitFor(() => expect(mockAuthService.requestOtp).toHaveBeenCalledWith(E164));
    expect(await screen.findByText('Code sent')).toBeOnTheScreen();
    expect(screen.getByText('Resend in 1:00')).toBeOnTheScreen();
  });

  it('shows the wait inline when resending is rate limited', async () => {
    mockAuthService.requestOtp.mockRejectedValue(
      new AuthError('TOO_MANY_REQUESTS', { retryAfterSec: 120 }),
    );
    await renderVerify({ phone: E164 });
    await fireEvent.press(screen.getByTestId(AUTH_TEST_IDS.otpResend));

    expect(await screen.findByText('Too many attempts. Try again in 2 min')).toBeOnTheScreen();
    expect(screen.getByText('Resend in 2:00')).toBeOnTheScreen();
  });

  it('fills in the mock code from the dev hint', async () => {
    mockAuthService.verifyOtp.mockResolvedValue(session);
    await renderVerify();
    expect(screen.getByText(`Dev code: ${MOCK_OTP_CODE}`)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId(AUTH_TEST_IDS.otpDevHint));
    await waitFor(() =>
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(E164, MOCK_OTP_CODE),
    );
  });

  it('goes back to the phone screen', async () => {
    await renderVerify();
    await fireEvent.press(screen.getByTestId(AUTH_TEST_IDS.otpChangeNumber));
    expect(router.back).toHaveBeenCalledTimes(1);

    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await fireEvent.press(screen.getByTestId(AUTH_TEST_IDS.verifyBack));
    expect(router.replace).toHaveBeenCalledWith('/(public)/sign-in');
  });

  it('treats a missing or malformed phone as a broken link', async () => {
    await renderVerify({ phone: '+998 90 123 45 67' });
    expect(screen.getByText('Number not recognised')).toBeOnTheScreen();
    expect(screen.queryByTestId(AUTH_TEST_IDS.otpInput)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Change number' }));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
