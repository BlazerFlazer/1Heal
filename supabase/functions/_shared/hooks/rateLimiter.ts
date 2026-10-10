/**
 * Extra SMS limits on top of Supabase Auth's own (`[auth.sms] max_frequency`, `[auth.rate_limit]
 * sms_sent`), ADR-003. The source of truth is `public.sms_rate_limit_check` in
 * supabase/migrations/0090_sms_send_log_policies.sql; `SMS_RATE_LIMITS` and `InMemorySmsLog`
 * mirror it for unit tests and must stay identical.
 */
import type { SmsPurpose } from '../sms/SmsProvider';

export interface RateLimitRule {
  readonly scope: 'phone' | 'ip';
  readonly rule: string;
  readonly max: number;
  readonly windowSec: number;
}

export const SMS_RATE_LIMITS: readonly RateLimitRule[] = [
  { scope: 'phone', rule: 'phone_10m', max: 3, windowSec: 10 * 60 },
  { scope: 'phone', rule: 'phone_24h', max: 10, windowSec: 24 * 60 * 60 },
  { scope: 'ip', rule: 'ip_1h', max: 20, windowSec: 60 * 60 },
];

export interface RateLimitInput {
  phone: string;
  ip?: string;
  purpose: SmsPurpose;
  now: Date;
}

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; scope: 'phone' | 'ip'; rule: string; retryAfterSec: number };

export interface RateLimiter {
  /** Throws when the backing store is unreachable; the hook then fails closed. */
  check(input: RateLimitInput): Promise<RateLimitDecision>;
}

/** What the hook writes to sms_send_log.status. */
export type SmsLogStatus = 'sent' | 'failed' | 'rate_limited';

/** Attempts handed to a provider count against the limits; rejected ones do not. */
export const COUNTED_STATUSES: ReadonlySet<SmsLogStatus> = new Set(['sent', 'failed']);

export interface SmsLogEntry {
  phone: string;
  purpose: SmsPurpose;
  provider: string;
  providerMessageId?: string;
  status: SmsLogStatus;
  ip?: string;
  at: Date;
}

export interface SmsSendLog {
  record(entry: SmsLogEntry): Promise<void>;
}

/**
 * Applies `rules` to the timestamps (ms) of the counted attempts of one scope. The window is
 * (now - window, now], as in the SQL function. When a rule trips, `retryAfterSec` is when enough
 * of the oldest attempts have left the window.
 */
export function evaluateRules(
  timestampsMs: readonly number[],
  rules: readonly RateLimitRule[],
  nowMs: number,
): RateLimitDecision {
  for (const rule of rules) {
    const windowMs = rule.windowSec * 1000;
    const inWindow = timestampsMs
      .filter((at) => at > nowMs - windowMs && at <= nowMs)
      .sort((a, b) => a - b);
    if (inWindow.length < rule.max) continue;
    const releasing = inWindow[inWindow.length - rule.max] ?? nowMs;
    const retryAfterSec = Math.max(1, Math.ceil((releasing + windowMs - nowMs) / 1000));
    return { allowed: false, scope: rule.scope, rule: rule.rule, retryAfterSec };
  }
  return { allowed: true };
}

/** Rate limiter and send log in one array: tests and single-process dev. */
export class InMemorySmsLog implements RateLimiter, SmsSendLog {
  readonly entries: SmsLogEntry[] = [];

  constructor(private readonly rules: readonly RateLimitRule[] = SMS_RATE_LIMITS) {}

  async check(input: RateLimitInput): Promise<RateLimitDecision> {
    const nowMs = input.now.getTime();
    const counted = this.entries.filter(
      (entry) => entry.purpose === input.purpose && COUNTED_STATUSES.has(entry.status),
    );
    const byPhone = counted.filter((entry) => entry.phone === input.phone);
    const phoneDecision = evaluateRules(
      byPhone.map((entry) => entry.at.getTime()),
      this.rules.filter((rule) => rule.scope === 'phone'),
      nowMs,
    );
    if (!phoneDecision.allowed) return phoneDecision;
    if (input.ip === undefined) return { allowed: true };
    const byIp = counted.filter((entry) => entry.ip === input.ip);
    return evaluateRules(
      byIp.map((entry) => entry.at.getTime()),
      this.rules.filter((rule) => rule.scope === 'ip'),
      nowMs,
    );
  }

  async record(entry: SmsLogEntry): Promise<void> {
    this.entries.push({ ...entry });
  }
}
