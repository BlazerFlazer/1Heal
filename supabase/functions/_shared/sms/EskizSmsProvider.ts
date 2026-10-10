/**
 * Eskiz.uz adapter. Base https://notify.eskiz.uz/api, the contract as implemented by the public
 * SDKs cited in supabase/functions/README.md:
 *   POST  /auth/login        form { email, password }            → { data: { token } }  (JWT)
 *   PATCH /auth/refresh      Authorization: Bearer <token>       → { data: { token } }
 *   POST  /message/sms/send  form { mobile_phone, message, from, callback_url? } + Bearer
 *                                                                → { id, status, message }
 * The token is cached in memory until its JWT `exp`; a 401 from /send triggers one refresh (or a
 * fresh login) and a single retry. `fetch` and the clock are injectable for tests.
 */
import { e164ToDigits, UZ_E164_PATTERN } from '../phone';
import { SmsError, type SmsProvider, type SmsSendInput, type SmsSendResult } from './SmsProvider';

export const ESKIZ_BASE_URL = 'https://notify.eskiz.uz/api';
/** Eskiz's shared test sender; a registered brand name replaces it (docs/COMPLIANCE.md §3). */
export const ESKIZ_DEFAULT_FROM = '4546';
const DEFAULT_TIMEOUT_MS = 3000;
/** Re-login after this long when the token JWT carries no `exp`. */
const FALLBACK_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_SAFETY_MS = 60 * 1000;

export interface EskizConfig {
  email: string;
  password: string;
  /** Sender name ("from"). */
  from?: string;
  baseUrl?: string;
  callbackUrl?: string;
  timeoutMs?: number;
}

export interface EskizDeps {
  fetch?: typeof fetch;
  /** Milliseconds since the epoch. */
  now?: () => number;
}

interface CachedToken {
  value: string;
  expiresAtMs: number;
}

type Json = Record<string, unknown>;

export class EskizSmsProvider implements SmsProvider {
  readonly name = 'eskiz';
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private token: CachedToken | null = null;

  constructor(
    private readonly config: EskizConfig,
    deps: EskizDeps = {},
  ) {
    this.fetchFn = deps.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.now = deps.now ?? (() => Date.now());
    this.baseUrl = (config.baseUrl ?? ESKIZ_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    if (!UZ_E164_PATTERN.test(input.to)) {
      throw new SmsError('INVALID_NUMBER', 'Eskiz delivers to Uzbekistan numbers only (+998…)');
    }
    let token = await this.getToken();
    let response = await this.postSms(token, input);
    if (response.status === 401) {
      token = await this.renewToken(token);
      response = await this.postSms(token, input);
    }
    const json = await readJson(response);
    if (!response.ok) throw mapError(response.status, json, 'send');
    // PROVIDER-STUB: a 200 with status "fail" is how the Python SDK reports rejected sends; the
    // exact shape is unverified against the live API.
    if (readString(json, 'status') === 'fail') throw mapError(400, json, 'send');
    const id = readString(json, 'id');
    return id === undefined ? {} : { providerMessageId: id };
  }

  private postSms(token: string, input: SmsSendInput): Promise<Response> {
    const form = new FormData();
    form.set('mobile_phone', e164ToDigits(input.to));
    form.set('message', input.text);
    form.set('from', this.config.from ?? ESKIZ_DEFAULT_FROM);
    if (this.config.callbackUrl) form.set('callback_url', this.config.callbackUrl);
    return this.request('/message/sms/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
  }

  private async getToken(): Promise<string> {
    if (this.token !== null && this.token.expiresAtMs > this.now()) return this.token.value;
    return this.login();
  }

  private async login(): Promise<string> {
    const form = new FormData();
    form.set('email', this.config.email);
    form.set('password', this.config.password);
    const response = await this.request('/auth/login', { method: 'POST', body: form });
    const json = await readJson(response);
    if (!response.ok) throw mapError(response.status, json, 'login');
    const token = readToken(json);
    if (token === null) throw new SmsError('UNKNOWN', 'Eskiz login response carried no token');
    return this.storeToken(token);
  }

  /** PATCH /auth/refresh; when Eskiz rejects the old token too, logs in again. */
  private async renewToken(current: string): Promise<string> {
    const response = await this.request('/auth/refresh', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${current}` },
    });
    const token = response.ok ? readToken(await readJson(response)) : null;
    if (token !== null) return this.storeToken(token);
    this.token = null;
    return this.login();
  }

  private storeToken(value: string): string {
    const expiresAtMs = jwtExpiryMs(value) ?? this.now() + FALLBACK_TOKEN_TTL_MS;
    this.token = { value, expiresAtMs: expiresAtMs - TOKEN_SAFETY_MS };
    return value;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SmsError('PROVIDER_DOWN', `Eskiz request failed: ${reason}`, { cause: error });
    }
  }
}

function mapError(status: number, json: Json, phase: 'login' | 'send'): SmsError {
  const detail = readMessage(json) ?? `HTTP ${status}`;
  const message = `Eskiz ${phase} failed: ${detail}`;
  if (status === 401 || status === 403) return new SmsError('AUTH', message, { status });
  if (status === 429) return new SmsError('RATE_LIMIT', message, { status });
  if (status >= 500) return new SmsError('PROVIDER_DOWN', message, { status });
  // PROVIDER-STUB: Eskiz does not document a machine-readable reason for 400; the text is matched.
  if ((status === 400 || status === 422) && /phone|mobile|number|recipient/i.test(detail)) {
    return new SmsError('INVALID_NUMBER', message, { status });
  }
  return new SmsError('UNKNOWN', message, { status });
}

async function readJson(response: Response): Promise<Json> {
  try {
    const value: unknown = await response.json();
    return typeof value === 'object' && value !== null ? (value as Json) : {};
  } catch {
    return {};
  }
}

function readToken(json: Json): string | null {
  const data = json.data;
  if (typeof data !== 'object' || data === null) return null;
  return readString(data as Json, 'token') ?? null;
}

/** `message`, `data.alert` or `data.message`, whichever Eskiz filled. */
function readMessage(json: Json): string | undefined {
  const data = typeof json.data === 'object' && json.data !== null ? (json.data as Json) : {};
  return readString(json, 'message') ?? readString(data, 'alert') ?? readString(data, 'message');
}

function readString(json: Json, key: string): string | undefined {
  const value = json[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** `exp` of a JWT in milliseconds, without verifying it (Eskiz signs, we only schedule). */
export function jwtExpiryMs(token: string): number | null {
  const payload = token.split('.')[1];
  if (payload === undefined) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    const exp =
      typeof claims === 'object' && claims !== null ? (claims as Json).exp : undefined;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}
