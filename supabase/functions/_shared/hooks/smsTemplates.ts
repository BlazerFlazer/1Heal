/**
 * OTP text per locale. Templates are plain strings with `{{brand}}` and `{{otp}}` placeholders so
 * operators can override them from the environment later without touching code. Eskiz may
 * require pre-approval of the final text (docs/COMPLIANCE.md §3): change here, re-submit there.
 */
import { BRAND_NAME } from '../brand';
import { DEFAULT_SMS_LOCALE, type SmsLocale } from './sendSmsPayload';

export type OtpTemplates = Readonly<Record<SmsLocale, string>>;

export const OTP_TEMPLATES: OtpTemplates = {
  ru: '{{brand}}: ваш код {{otp}}. Никому не сообщайте его.',
  uz: '{{brand}}: sizning kodingiz {{otp}}. Uni hech kimga aytmang.',
  en: '{{brand}}: your code is {{otp}}. Do not share it with anyone.',
};

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export function renderTemplate(template: string, vars: Readonly<Record<string, string>>): string {
  return template.replace(PLACEHOLDER, (match, key: string) => vars[key] ?? match);
}

export function renderOtpSms(
  locale: SmsLocale,
  otp: string,
  templates: OtpTemplates = OTP_TEMPLATES,
): string {
  const template = templates[locale] ?? templates[DEFAULT_SMS_LOCALE];
  return renderTemplate(template, { brand: BRAND_NAME, otp });
}
