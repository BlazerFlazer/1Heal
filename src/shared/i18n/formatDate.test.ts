import { NBSP } from './chars';
import {
  formatDate,
  formatDateRange,
  formatDuration,
  formatRelativeDay,
  formatTime,
  formatTimeRange,
  monthName,
  weekdayIndex,
  weekdayName,
} from './formatDate';
import { SUPPORTED_LOCALES } from './types';

/** Thursday 8 October 2026, 09:05 local time. */
const oct8 = new Date(2026, 9, 8, 9, 5);
const oct12 = new Date(2026, 9, 12, 10, 30);
const nov7 = new Date(2026, 10, 7);
const dec28 = new Date(2026, 11, 28);
const jan3 = new Date(2027, 0, 3);

describe('formatDate', () => {
  it.each([
    ['ru', '8 окт', '8 окт 2026', '8 октября 2026', 'четверг, 8 октября'],
    ['uz', '8-okt', '8-okt, 2026', '8-oktabr, 2026', 'payshanba, 8-oktabr'],
    ['en', '8 Oct', '8 Oct 2026', '8 October 2026', 'Thursday, 8 October'],
  ] as const)('%s renders every style', (locale, short, shortYear, long, weekday) => {
    expect(formatDate(oct8, locale, 'short')).toBe(short);
    expect(formatDate(oct8, locale, 'shortYear')).toBe(shortYear);
    expect(formatDate(oct8, locale, 'long')).toBe(long);
    expect(formatDate(oct8, locale, 'weekday')).toBe(weekday);
  });

  it('defaults to the short style', () => {
    expect(formatDate(oct8, 'ru')).toBe('8 окт');
  });

  it('takes month and weekday names from the locale tables, not Intl', () => {
    const intl = jest.spyOn(Intl, 'DateTimeFormat');
    const toLocale = jest.spyOn(Date.prototype, 'toLocaleDateString');
    expect(formatDate(new Date(2026, 0, 5), 'uz', 'weekday')).toBe('dushanba, 5-yanvar');
    expect(formatDate(new Date(2026, 11, 27), 'ru', 'weekday')).toBe('воскресенье, 27 декабря');
    expect(intl).not.toHaveBeenCalled();
    expect(toLocale).not.toHaveBeenCalled();
    intl.mockRestore();
    toLocale.mockRestore();
  });
});

describe('month and weekday helpers', () => {
  it('indexes weekdays Monday-first', () => {
    expect(weekdayIndex(new Date(2026, 0, 5))).toBe(0);
    expect(weekdayIndex(new Date(2026, 0, 11))).toBe(6);
  });

  it('returns names in both forms', () => {
    expect(monthName(oct8, 'en', 'short')).toBe('Oct');
    expect(monthName(oct8, 'ru', 'long')).toBe('октября');
    expect(weekdayName(oct8, 'uz', 'short')).toBe('Pay');
    expect(weekdayName(oct8, 'en', 'long')).toBe('Thursday');
  });
});

describe('formatTime and formatTimeRange', () => {
  it.each(SUPPORTED_LOCALES)('%s uses a zero-padded 24-hour clock', (locale) => {
    expect(formatTime(oct8, locale)).toBe('09:05');
    expect(formatTime(new Date(2026, 9, 8, 23, 59), locale)).toBe('23:59');
    expect(formatTime(new Date(2026, 9, 8, 0, 0), locale)).toBe('00:00');
    expect(formatTime(new Date(2026, 9, 8, 13, 7), locale)).toBe('13:07');
    expect(formatTimeRange(oct8, oct12, locale)).toBe('09:05–10:30');
  });
});

describe('formatRelativeDay', () => {
  const now = new Date(2026, 9, 8, 23, 30);

  it.each([
    ['ru', 'Сегодня', 'Завтра', 'Вчера'],
    ['uz', 'Bugun', 'Ertaga', 'Kecha'],
    ['en', 'Today', 'Tomorrow', 'Yesterday'],
  ] as const)('%s names the surrounding days', (locale, today, tomorrow, yesterday) => {
    expect(formatRelativeDay(new Date(2026, 9, 8, 0, 10), locale, now)).toBe(today);
    expect(formatRelativeDay(new Date(2026, 9, 9, 6, 0), locale, now)).toBe(tomorrow);
    expect(formatRelativeDay(new Date(2026, 9, 7, 12, 0), locale, now)).toBe(yesterday);
  });

  it('falls back to the short date further away', () => {
    expect(formatRelativeDay(oct12, 'ru', now)).toBe('12 окт');
    expect(formatRelativeDay(new Date(2026, 9, 1), 'en', now)).toBe('1 Oct');
    expect(formatRelativeDay(new Date(2026, 9, 6), 'uz', now)).toBe('6-okt');
  });

  it('compares calendar days, not 24-hour windows', () => {
    expect(formatRelativeDay(new Date(2026, 9, 9, 0, 5), 'en', now)).toBe('Tomorrow');
    expect(formatRelativeDay(new Date(2026, 9, 10, 0, 5), 'en', now)).toBe('10 Oct');
  });
});

describe('formatDateRange', () => {
  it('collapses to one date on the same day', () => {
    expect(formatDateRange(oct8, new Date(2026, 9, 8, 20), 'ru')).toBe('8 окт');
  });

  it.each([
    ['ru', '8–12 окт', '8 окт – 7 ноя', '28 дек 2026 – 3 янв 2027'],
    ['uz', '8–12-okt', '8-okt – 7-noy', '28-dek, 2026 – 3-yan, 2027'],
    ['en', '8–12 Oct', '8 Oct – 7 Nov', '28 Dec 2026 – 3 Jan 2027'],
  ] as const)('%s compacts ranges', (locale, sameMonth, sameYear, crossYear) => {
    expect(formatDateRange(oct8, oct12, locale)).toBe(sameMonth);
    expect(formatDateRange(oct8, nov7, locale)).toBe(sameYear);
    expect(formatDateRange(dec28, jan3, locale)).toBe(crossYear);
  });
});

describe('formatDuration', () => {
  it.each([
    ['ru', `1${NBSP}ч 30${NBSP}мин`, `2${NBSP}ч`, `45${NBSP}мин`, `0${NBSP}мин`],
    ['uz', `1${NBSP}soat 30${NBSP}daq`, `2${NBSP}soat`, `45${NBSP}daq`, `0${NBSP}daq`],
    ['en', `1${NBSP}h 30${NBSP}min`, `2${NBSP}h`, `45${NBSP}min`, `0${NBSP}min`],
  ] as const)('%s', (locale, ninety, twoHours, fortyFive, zero) => {
    expect(formatDuration(90, locale)).toBe(ninety);
    expect(formatDuration(120, locale)).toBe(twoHours);
    expect(formatDuration(45, locale)).toBe(fortyFive);
    expect(formatDuration(0, locale)).toBe(zero);
  });

  it('rounds to whole minutes and clamps negatives', () => {
    expect(formatDuration(89.6, 'en')).toBe(`1${NBSP}h 30${NBSP}min`);
    expect(formatDuration(-5, 'en')).toBe(`0${NBSP}min`);
  });
});
