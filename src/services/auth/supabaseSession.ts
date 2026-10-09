import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { z } from 'zod';

import { localeSchema } from '@/shared/i18n/types';
import { parseUzPhone } from '@/shared/utils/phone';

import { AuthError, type Role, roleSchema, type Session, type SessionProfile } from './types';

export const DEFAULT_ROLES: readonly Role[] = ['member'];

/** The custom access-token hook (M2) writes `app_metadata.roles` from `user_roles`. */
const rolesClaimSchema = z.object({
  app_metadata: z.object({ roles: z.array(roleSchema).min(1) }),
});

const userMetadataSchema = z.object({
  full_name: z.string().min(1).optional(),
  locale: localeSchema.optional(),
});

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  let percentEncoded = '';
  for (let index = 0; index < binary.length; index += 1) {
    percentEncoded += `%${binary.charCodeAt(index).toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(percentEncoded);
}

/** The JWT payload as parsed JSON, or `null` for anything that is not a well-formed JWT. */
export function decodeJwtPayload(token: string): unknown {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(base64UrlDecode(payload)) as unknown;
  } catch {
    return null;
  }
}

/** Roles from the `app_metadata.roles` claim; `['member']` when the claim is missing or malformed. */
export function rolesFromAccessToken(accessToken: string): Role[] {
  const claims = rolesClaimSchema.safeParse(decodeJwtPayload(accessToken));
  return claims.success ? claims.data.app_metadata.roles : [...DEFAULT_ROLES];
}

export function toSession(session: SupabaseSession, deviceId: string): Session {
  const phone = parseUzPhone(session.user.phone ?? '');
  if (!phone) {
    throw new AuthError('UNKNOWN', { message: 'Supabase session has no Uzbek phone number' });
  }
  const expiresAtMs =
    session.expires_at !== undefined
      ? session.expires_at * 1000
      : Date.now() + session.expires_in * 1000;

  const profile: SessionProfile = {};
  const metadata = userMetadataSchema.safeParse(session.user.user_metadata);
  if (metadata.success) {
    if (metadata.data.full_name !== undefined) profile.fullName = metadata.data.full_name;
    if (metadata.data.locale !== undefined) profile.locale = metadata.data.locale;
  }

  return {
    userId: session.user.id,
    phoneE164: phone.e164,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date(expiresAtMs).toISOString(),
    roles: rolesFromAccessToken(session.access_token),
    deviceId,
    profile,
  };
}
