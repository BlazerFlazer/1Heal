/**
 * Rate limiter and send log backed by Postgres through the Supabase Data API (PostgREST), with
 * the service-role key: `rpc/sms_rate_limit_check` (supabase/migrations/0090) and inserts into
 * `sms_send_log`. Plain fetch so the module runs in Deno and in Jest alike.
 */
import {
  type RateLimitDecision,
  type RateLimiter,
  type RateLimitInput,
  type SmsLogEntry,
  type SmsSendLog,
} from './rateLimiter';

export interface RestSmsLogConfig {
  /** The project URL, e.g. https://xyz.supabase.co (SUPABASE_URL in Edge Functions). */
  supabaseUrl: string;
  serviceRoleKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/** Auth gives the whole hook 5 s per attempt; the check and the insert must leave room for the SMS. */
const DEFAULT_TIMEOUT_MS = 1500;

/** The store did not answer; the hook fails closed with a retryable response. */
export class SmsLogUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SmsLogUnavailableError';
    this.cause = cause;
  }
}

export class RestSmsLog implements RateLimiter, SmsSendLog {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: RestSmsLogConfig) {
    this.fetchFn = config.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.baseUrl = config.supabaseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async check(input: RateLimitInput): Promise<RateLimitDecision> {
    const response = await this.post('/rest/v1/rpc/sms_rate_limit_check', {
      p_phone_e164: input.phone,
      p_ip: input.ip ?? null,
      p_purpose: input.purpose,
    });
    if (!response.ok) {
      throw new SmsLogUnavailableError(
        `sms_rate_limit_check failed: HTTP ${response.status} ${await safeText(response)}`,
      );
    }
    return parseDecision(await response.json().catch(() => null));
  }

  async record(entry: SmsLogEntry): Promise<void> {
    const response = await this.post(
      '/rest/v1/sms_send_log',
      {
        phone_e164: entry.phone,
        purpose: entry.purpose,
        provider: entry.provider,
        provider_msg_id: entry.providerMessageId ?? null,
        status: entry.status,
        ip: entry.ip ?? null,
      },
      { prefer: 'return=minimal' },
    );
    if (!response.ok) {
      throw new SmsLogUnavailableError(
        `sms_send_log insert failed: HTTP ${response.status} ${await safeText(response)}`,
      );
    }
  }

  private async post(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          apikey: this.config.serviceRoleKey,
          authorization: `Bearer ${this.config.serviceRoleKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SmsLogUnavailableError(`request to ${path} failed: ${reason}`, error);
    }
  }
}

/** `{ allowed: true }` or `{ allowed: false, scope, rule, retry_after_sec }` from the SQL function. */
export function parseDecision(json: unknown): RateLimitDecision {
  if (typeof json !== 'object' || json === null) {
    throw new SmsLogUnavailableError('sms_rate_limit_check returned no JSON object');
  }
  const record = json as Record<string, unknown>;
  if (record.allowed === true) return { allowed: true };
  const scope = record.scope;
  const rule = record.rule;
  const retryAfterSec = record.retry_after_sec;
  if (
    record.allowed === false &&
    (scope === 'phone' || scope === 'ip') &&
    typeof rule === 'string' &&
    typeof retryAfterSec === 'number'
  ) {
    return { allowed: false, scope, rule, retryAfterSec: Math.max(1, Math.ceil(retryAfterSec)) };
  }
  throw new SmsLogUnavailableError('sms_rate_limit_check returned an unexpected shape');
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 200);
  } catch {
    return '';
  }
}
