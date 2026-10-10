import { BRAND_NAME as APP_BRAND_NAME } from '../../../src/shared/config/brand';
import { BRAND_NAME } from '../../functions/_shared/brand';
import { SMS_LOCALES } from '../../functions/_shared/hooks/sendSmsPayload';
import {
  OTP_TEMPLATES,
  renderOtpSms,
  renderTemplate,
} from '../../functions/_shared/hooks/smsTemplates';

describe('OTP templates', () => {
  test('the Edge Function brand constant equals the app brand constant', () => {
    expect(BRAND_NAME).toBe(APP_BRAND_NAME);
  });

  test.each(SMS_LOCALES)(
    '%s: contains the brand and the code, no leftover placeholders',
    (locale) => {
      const text = renderOtpSms(locale, '482913');
      expect(text.startsWith(`${BRAND_NAME}: `)).toBe(true);
      expect(text).toContain('482913');
      expect(text).not.toMatch(/\{\{|\}\}/);
      expect(text.length).toBeLessThanOrEqual(70);
    },
  );

  test('each locale has its own wording', () => {
    expect(renderOtpSms('ru', '111111')).toBe('1Heal: ваш код 111111. Никому не сообщайте его.');
    expect(renderOtpSms('uz', '111111')).toBe(
      '1Heal: sizning kodingiz 111111. Uni hech kimga aytmang.',
    );
    expect(renderOtpSms('en', '111111')).toBe(
      '1Heal: your code is 111111. Do not share it with anyone.',
    );
    expect(new Set(Object.values(OTP_TEMPLATES)).size).toBe(SMS_LOCALES.length);
  });

  test('custom templates override the defaults and fall back to ru', () => {
    const templates = { ...OTP_TEMPLATES, en: '{{brand}} code {{otp}}' };
    expect(renderOtpSms('en', '2222', templates)).toBe(`${BRAND_NAME} code 2222`);
    const partial = { ru: 'RU {{otp}}' } as unknown as typeof OTP_TEMPLATES;
    expect(renderOtpSms('uz', '3333', partial)).toBe('RU 3333');
  });

  test('renderTemplate leaves unknown placeholders untouched and tolerates spaces', () => {
    expect(renderTemplate('{{ brand }} {{otp}} {{other}}', { brand: 'B', otp: '1' })).toBe(
      'B 1 {{other}}',
    );
  });
});
