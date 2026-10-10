/**
 * Brand name for SMS text. Mirrors `src/shared/config/brand.ts` (Edge Functions cannot import the
 * app bundle); `supabase/tests/functions/smsTemplates.test.ts` fails when the two drift.
 */
export const BRAND_NAME = '1Heal' as const;
