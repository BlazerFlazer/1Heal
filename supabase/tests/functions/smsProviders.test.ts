import { createMemoryLogger } from '../../functions/_shared/log';
import { EskizSmsProvider } from '../../functions/_shared/sms/EskizSmsProvider';
import { createSmsProvider, SmsError } from '../../functions/_shared/sms/index';
import { MockSmsProvider } from '../../functions/_shared/sms/MockSmsProvider';

describe('MockSmsProvider', () => {
  test('records the message, returns an id and logs structured JSON with the text', async () => {
    const log = createMemoryLogger();
    const provider = new MockSmsProvider({ log });
    await expect(
      provider.send({ to: '+998901234567', text: 'code 123456', purpose: 'otp' }),
    ).resolves.toEqual({ providerMessageId: 'mock-1' });
    await provider.send({ to: '+998901234567', text: 'code 654321', purpose: 'notice' });
    expect(provider.sent.map((m) => [m.id, m.text, m.purpose])).toEqual([
      ['mock-1', 'code 123456', 'otp'],
      ['mock-2', 'code 654321', 'notice'],
    ]);
    expect(log.entries[0]).toMatchObject({
      level: 'info',
      event: 'sms_mock_sent',
      provider: 'mock',
      phone_masked: '+99890*****67',
      text: 'code 123456',
      provider_msg_id: 'mock-1',
    });
    expect(provider.name).toBe('mock');
  });

  test('fails every send with the configured error', async () => {
    const provider = new MockSmsProvider({
      log: createMemoryLogger(),
      failWith: new SmsError('PROVIDER_DOWN', 'simulated outage'),
    });
    await expect(
      provider.send({ to: '+998901234567', text: 'x', purpose: 'otp' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_DOWN', retryable: true });
    expect(provider.sent).toHaveLength(0);
  });

  test('logs to the console by default as one JSON line', async () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((line: string) => {
      lines.push(line);
    });
    try {
      await new MockSmsProvider().send({ to: '+998901234567', text: 'x', purpose: 'otp' });
    } finally {
      spy.mockRestore();
    }
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({ event: 'sms_mock_sent', level: 'info' });
  });
});

describe('createSmsProvider', () => {
  test('defaults to the mock provider', () => {
    expect(createSmsProvider({})).toBeInstanceOf(MockSmsProvider);
    expect(createSmsProvider({ SMS_PROVIDER: ' Mock ' })).toBeInstanceOf(MockSmsProvider);
  });

  test('builds the Eskiz provider from ESKIZ_* variables', () => {
    const provider = createSmsProvider({
      SMS_PROVIDER: 'eskiz',
      ESKIZ_EMAIL: 'ops@example.test',
      ESKIZ_PASSWORD: 'secret',
      ESKIZ_FROM: '1Heal',
    });
    expect(provider).toBeInstanceOf(EskizSmsProvider);
    expect(provider.name).toBe('eskiz');
  });

  test('refuses eskiz without credentials and unknown provider names', () => {
    expect(() => createSmsProvider({ SMS_PROVIDER: 'eskiz' })).toThrow(/ESKIZ_EMAIL is required/);
    expect(() =>
      createSmsProvider({ SMS_PROVIDER: 'eskiz', ESKIZ_EMAIL: 'a', ESKIZ_PASSWORD: ' ' }),
    ).toThrow(/ESKIZ_PASSWORD is required/);
    expect(() => createSmsProvider({ SMS_PROVIDER: 'twilio' })).toThrow(/mock, eskiz/);
  });
});

describe('SmsError', () => {
  test('exposes code, status, cause and retryability', () => {
    const cause = new Error('boom');
    const error = new SmsError('RATE_LIMIT', 'slow down', { status: 429, cause });
    expect(error.name).toBe('SmsError');
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.status).toBe(429);
    expect(error.cause).toBe(cause);
    expect(error.retryable).toBe(true);
    expect(new SmsError('INVALID_NUMBER', 'x').retryable).toBe(false);
  });
});
