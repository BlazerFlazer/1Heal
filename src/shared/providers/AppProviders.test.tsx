import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { Text } from 'react-native';

import { useTheme } from '@/shared/theme/ThemeProvider';
import { useToast } from '@/shared/ui/Toast';

import { AppProviders } from './AppProviders';

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
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(),
  useNetworkState: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));

/** Reads from every provider in the stack; throws (and fails the test) when one is missing. */
function Probe() {
  const { scheme } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ready = Boolean(toast.show) && Boolean(queryClient.getQueryCache());
  return <Text testID="probe">{ready ? scheme : 'missing'}</Text>;
}

describe('AppProviders', () => {
  beforeEach(() => {
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    jest.mocked(Network.addNetworkStateListener).mockReturnValue({ remove: jest.fn() });
  });

  it('mounts theme, query and toast providers around its children', async () => {
    await render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('light');
  });

  it('forces a colour scheme when asked', async () => {
    await render(
      <AppProviders scheme="dark">
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('dark');
  });
});
