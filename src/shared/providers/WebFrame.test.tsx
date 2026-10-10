import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemeProvider } from '@/shared/theme/ThemeProvider';

import { WebFrame } from './WebFrame';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('lucide-react-native', () =>
  jest.requireActual('@/shared/ui/gallery/testing/lucideMock').createLucideMock(),
);

describe('WebFrame', () => {
  it('renders children unchanged on native', async () => {
    await render(
      <ThemeProvider>
        <WebFrame>
          <Text testID="child">app</Text>
        </WebFrame>
      </ThemeProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('app');
    expect(screen.queryByTestId('web-frame')).toBeNull();
  });
});
