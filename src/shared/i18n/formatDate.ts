import { EN_DASH, NBSP } from './chars';
import { resources } from './resources';
import type { Locale } from './types';

/**
 * `short` "8 окт" · `shortYear` "8 окт 2026" · `long` "8 октября 2026" ·
 * `weekday` "четверг, 8 октября". Patterns and names live in common.json, so
 * Uzbek never depends on the engine's Intl data (Hermes on Android lacks it).
 */
export type DateStyle = 'short' | 'shortYear' | 'long' | 'weekday';

type NameForm = 'short' | 'long';

const MS_PER_DAY = 86_400_000;

function commonCopy(locale: Locale) {
  return resources[locale].translation.common;
}

function fill(pattern: string, values: Record<string, string | number>): string {
  return pattern.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values[name] ?? ''));
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Monday-first index (0 = Monday … 6 = Sunday), matching the `weekdays` arrays in common.json. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function monthName(date: Date, locale: Locale, form: NameForm): string {
  return commonCopy(locale).months[form][date.getMonth()] ?? '';
}

export function weekdayName(date: Date, locale: Locale, form: NameForm): string {
  return commonCopy(locale).weekdays[form][weekdayIndex(date)] ?? '';
}

export function formatDate(date: Date, locale: Locale, style: DateStyle = 'short'): string {
  const monthForm: NameForm = style === 'short' || style === 'shortYear' ? 'short' : 'long';
  return fill(commonCopy(locale).dateFormats[style], {
    day: date.getDate(),
    month: monthName(date, locale, monthForm),
    year: date.getFullYear(),
    weekday: weekdayName(date, locale, 'long'),
  });
}

/** 24-hour clock in every locale: "09:05". `locale` is accepted for API symmetry. */
export function formatTime(date: Date, locale: Locale): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "09:00–10:30" */
export function formatTimeRange(start: Date, end: Date, locale: Locale): string {
  return `${formatTime(start, locale)}${EN_DASH}${formatTime(end, locale)}`;
}

/** Calendar day in local time as an integer, so day differences ignore clock time and DST. */
function localDayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

/** "Сегодня" / "Завтра" / "Вчера" in the given language, otherwise the short date. */
export function formatRelativeDay(date: Date, locale: Locale, now: Date = new Date()): string {
  const diff = localDayNumber(date) - localDayNumber(now);
  const { time } = commonCopy(locale);
  if (diff === 0) return time.today;
  if (diff === 1) return time.tomorrow;
  if (diff === -1) return time.yesterday;
  return formatDate(date, locale, 'short');
}

/**
 * Compact range: same day "8 окт", same month "8–12 окт", same year
 * "8 окт – 7 ноя", otherwise "28 дек 2026 – 3 янв 2027".
 */
export function formatDateRange(start: Date, end: Date, locale: Locale): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth && start.getDate() === end.getDate()) {
    return formatDate(start, locale, 'short');
  }
  if (sameMonth) {
    return fill(commonCopy(locale).dateFormats.short, {
      day: `${start.getDate()}${EN_DASH}${end.getDate()}`,
      month: monthName(start, locale, 'short'),
    });
  }
  const style: DateStyle = sameYear ? 'short' : 'shortYear';
  return `${formatDate(start, locale, style)} ${EN_DASH} ${formatDate(end, locale, style)}`;
}

/**
 * "1 ч 30 мин" / "1 soat 30 daq" / "1 h 30 min". Whole minutes; a no-break
 * space keeps each number with its unit.
 */
export function formatDuration(minutes: number, locale: Locale): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const { hoursShort, minutesShort } = commonCopy(locale).time;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${NBSP}${hoursShort}`);
  if (rest > 0 || hours === 0) parts.push(`${rest}${NBSP}${minutesShort}`);
  return parts.join(' ');
}
