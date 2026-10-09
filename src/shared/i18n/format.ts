import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { MINUS_SIGN, NBSP } from './chars';
import {
  formatDate,
  formatDateRange,
  formatDuration,
  formatRelativeDay,
  formatTime,
  formatTimeRange,
  type DateStyle,
} from './formatDate';
import { i18n } from './i18n';
import { resources } from './resources';
import { toLocale, type Locale } from './types';

export * from './formatDate';

/** Integer with no-break-space thousands separators: 250000 → "250 000". Fractions are rounded. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return rounded < 0 ? `${MINUS_SIGN}${digits}` : digits;
}

export type MoneyOptions = { withCurrency?: boolean };

/** "250 000 сум" / "250 000 so'm" / "250 000 UZS". Amounts are integer UZS; 0 → "0 сум". */
export function formatMoney(amountUzs: number, locale: Locale, options: MoneyOptions = {}): string {
  const { withCurrency = true } = options;
  const number = formatNumber(amountUzs);
  if (!withCurrency) return number;
  return `${number}${NBSP}${resources[locale].translation.common.currency.suffix}`;
}

/** "+998901234567" → "+998 90 123 45 67". Anything else is returned unchanged. */
export function formatPhone(e164: string): string {
  if (!/^\+998\d{9}$/.test(e164)) return e164;
  const national = e164.slice(4);
  const parts = [
    national.slice(0, 2),
    national.slice(2, 5),
    national.slice(5, 7),
    national.slice(7, 9),
  ];
  return `+998 ${parts.join(' ')}`;
}

/**
 * Plural-aware count via i18next: formatCount('common.units.visits', 5) →
 * "5 посещений". Uses the active language unless `locale` is given.
 */
export function formatCount(key: string, count: number, locale?: Locale): string {
  const t = locale === undefined ? i18n.t : i18n.getFixedT(locale);
  return t(key, { count });
}

/** Every formatter with the locale passed explicitly. Inside components prefer `useFormatters()`. */
export const formatters = {
  formatNumber,
  formatMoney,
  formatPhone,
  formatCount,
  formatDate,
  formatTime,
  formatTimeRange,
  formatRelativeDay,
  formatDateRange,
  formatDuration,
} as const;

export type BoundFormatters = {
  locale: Locale;
  formatNumber: (value: number) => string;
  formatMoney: (amountUzs: number, options?: MoneyOptions) => string;
  formatPhone: (e164: string) => string;
  formatCount: (key: string, count: number) => string;
  formatDate: (date: Date, style?: DateStyle) => string;
  formatTime: (date: Date) => string;
  formatTimeRange: (start: Date, end: Date) => string;
  formatRelativeDay: (date: Date, now?: Date) => string;
  formatDateRange: (start: Date, end: Date) => string;
  formatDuration: (minutes: number) => string;
};

/** Formatters with the locale baked in, for code outside React (notifications, share text). */
export function createFormatters(locale: Locale): BoundFormatters {
  return {
    locale,
    formatNumber,
    formatMoney: (amountUzs, options) => formatMoney(amountUzs, locale, options),
    formatPhone,
    formatCount: (key, count) => formatCount(key, count, locale),
    formatDate: (date, style) => formatDate(date, locale, style),
    formatTime: (date) => formatTime(date, locale),
    formatTimeRange: (start, end) => formatTimeRange(start, end, locale),
    formatRelativeDay: (date, now) => formatRelativeDay(date, locale, now),
    formatDateRange: (start, end) => formatDateRange(start, end, locale),
    formatDuration: (minutes) => formatDuration(minutes, locale),
  };
}

/** Formatters bound to the active UI language; re-renders when it changes. */
export function useFormatters(): BoundFormatters {
  const { i18n: instance } = useTranslation();
  const locale = toLocale(instance.resolvedLanguage ?? instance.language);
  return useMemo(() => createFormatters(locale), [locale]);
}
