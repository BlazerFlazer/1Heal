import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { haptics } from './haptics';

jest.mock('expo-haptics', () => ({
  __esModule: true,
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const selectionAsync = jest.mocked(Haptics.selectionAsync);
const impactAsync = jest.mocked(Haptics.impactAsync);
const notificationAsync = jest.mocked(Haptics.notificationAsync);

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps each helper to the expo-haptics call', async () => {
    await haptics.selection();
    expect(selectionAsync).toHaveBeenCalledTimes(1);

    await haptics.light();
    expect(impactAsync).toHaveBeenLastCalledWith('light');
    await haptics.medium();
    expect(impactAsync).toHaveBeenLastCalledWith('medium');

    await haptics.success();
    expect(notificationAsync).toHaveBeenLastCalledWith('success');
    await haptics.warning();
    expect(notificationAsync).toHaveBeenLastCalledWith('warning');
    await haptics.error();
    expect(notificationAsync).toHaveBeenLastCalledWith('error');
  });

  it('swallows native errors', async () => {
    impactAsync.mockRejectedValueOnce(new Error('no haptics hardware'));
    await expect(haptics.light()).resolves.toBeUndefined();
  });

  it('does nothing on web', async () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'web');
    try {
      await haptics.selection();
      await haptics.medium();
      await haptics.error();
    } finally {
      restore.restore();
    }
    expect(selectionAsync).not.toHaveBeenCalled();
    expect(impactAsync).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });
});
