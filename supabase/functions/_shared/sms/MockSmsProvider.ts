/**
 * Dev and test provider: records every message in memory and logs it as structured JSON. The
 * text (and so the OTP) is logged on purpose: with `supabase functions serve` this is how a
 * developer reads the code for a number that is not in `[auth.sms.test_otp]`.
 */
import { createConsoleLogger, type Logger } from '../log';
import { maskPhone } from '../phone';
import type { SmsError, SmsProvider, SmsSendInput, SmsSendResult } from './SmsProvider';

export interface MockSentMessage extends SmsSendInput {
  id: string;
  at: string;
}

export interface MockSmsProviderOptions {
  log?: Logger;
  /** Makes every send fail with this error (tests). */
  failWith?: SmsError;
}

export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  readonly sent: MockSentMessage[] = [];
  private readonly log: Logger;
  private readonly failWith: SmsError | null;

  constructor(options: MockSmsProviderOptions = {}) {
    this.log = options.log ?? createConsoleLogger();
    this.failWith = options.failWith ?? null;
  }

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    if (this.failWith !== null) throw this.failWith;
    const message: MockSentMessage = {
      ...input,
      id: `mock-${this.sent.length + 1}`,
      at: new Date().toISOString(),
    };
    this.sent.push(message);
    this.log.log('info', 'sms_mock_sent', {
      provider: this.name,
      phone_masked: maskPhone(input.to),
      to: input.to,
      purpose: input.purpose,
      text: input.text,
      provider_msg_id: message.id,
    });
    return { providerMessageId: message.id };
  }
}
