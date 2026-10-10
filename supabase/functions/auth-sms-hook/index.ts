/**
 * Edge Function entry for the Supabase Auth "Send SMS" hook (supabase/config.toml
 * [auth.hook.send_sms]). The only file that touches Deno: everything else lives in ../_shared
 * and is unit-tested with Jest. Module resolution: ../deno.json. Env (see ../README.md):
 *   SEND_SMS_HOOK_SECRET (or SEND_SMS_HOOK_SECRETS), SMS_PROVIDER, ESKIZ_EMAIL, ESKIZ_PASSWORD,
 *   ESKIZ_FROM, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (the last two are injected by Supabase).
 */
import { RestSmsLog } from '../_shared/hooks/restSmsLog';
import { handleSendSms, type HookResponse } from '../_shared/hooks/sendSmsHook';
import { createConsoleLogger } from '../_shared/log';
import { createSmsProvider } from '../_shared/sms/index';

// Module-scoped view of the Deno global, so `tsc -p tsconfig.db.json` (Node types) accepts it.
declare const Deno: {
  env: { toObject(): Record<string, string> };
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};

const env = Deno.env.toObject();
const log = createConsoleLogger();

// Fail at boot, loudly, rather than accept unsigned requests or log nowhere.
const secret = env.SEND_SMS_HOOK_SECRET || env.SEND_SMS_HOOK_SECRETS || '';
if (secret.length === 0) {
  throw new Error('SEND_SMS_HOOK_SECRET is not set (format: v1,whsec_<base64>)');
}
const provider = createSmsProvider(env, { log });
const smsLog = new RestSmsLog({
  supabaseUrl: requireEnv('SUPABASE_URL'),
  serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
});
log.log('info', 'auth_sms_hook_started', { provider: provider.name });
if (provider.name === 'mock') {
  log.log('warn', 'sms_provider_mock', { hint: 'set SMS_PROVIDER=eskiz outside development' });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return toResponse({
      status: 405,
      headers: { allow: 'POST' },
      body: { error: { http_code: 405, message: 'Method not allowed' } },
    });
  }
  const startedAt = Date.now();
  try {
    const result = await handleSendSms({
      rawBody: await request.text(),
      headers: request.headers,
      secret,
      provider,
      rateLimiter: smsLog,
      sendLog: smsLog,
      log,
    });
    return toResponse(result);
  } catch (error) {
    // handleSendSms maps every expected failure itself; this is a bug or a broken request stream.
    log.log('error', 'sms_hook_crashed', {
      provider: provider.name,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      ms: Date.now() - startedAt,
    });
    return toResponse({
      status: 500,
      headers: {},
      body: { error: { http_code: 500, message: 'SMS hook failed' } },
    });
  }
});

function toResponse(result: HookResponse): Response {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json', ...result.headers },
  });
}

function requireEnv(name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
