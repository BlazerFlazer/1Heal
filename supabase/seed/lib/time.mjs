/**
 * Time helpers. All seeded times are expressed relative to a fixed anchor so the output never
 * depends on the clock: ANCHOR is Monday 2026-10-12 00:00 in Asia/Tashkent (UTC+5, no DST).
 * History lies in [ANCHOR - 60 days, ANCHOR), the timetable in [ANCHOR - 60 days, ANCHOR + 14 days).
 */
export const TZ = 'Asia/Tashkent';
export const TZ_OFFSET_MIN = 5 * 60;
export const ANCHOR_DATE = '2026-10-12';
export const HISTORY_DAYS = 60;
export const TIMETABLE_DAYS_AHEAD = 14;

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Epoch ms of a Tashkent local date + "HH:MM". */
export function localMs(date, hhmm = '00:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - TZ_OFFSET_MIN * MINUTE_MS;
}

export const ANCHOR = localMs(ANCHOR_DATE);

/** Local midnight of ANCHOR + `offset` days. */
export const dayStart = (offset) => ANCHOR + offset * DAY_MS;

/** Local weekday of a day offset, 0 = Sunday (extract(dow), like venue_hours.weekday). */
export const weekdayOfOffset = (offset) =>
  new Date(dayStart(offset) + TZ_OFFSET_MIN * MINUTE_MS).getUTCDay();

/** "HH:MM" -> minutes since midnight ("24:00" -> 1440). */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** ISO 8601 with the Tashkent offset, e.g. 2026-10-12T19:00:00+05:00. */
export function isoLocal(ms) {
  const shifted = new Date(ms + TZ_OFFSET_MIN * MINUTE_MS);
  return `${shifted.toISOString().slice(0, 19)}+05:00`;
}

/** Local calendar date "YYYY-MM-DD". */
export function localDate(ms) {
  return new Date(ms + TZ_OFFSET_MIN * MINUTE_MS).toISOString().slice(0, 10);
}

/** Local "YYYY-MM" month key. */
export const localMonth = (ms) => localDate(ms).slice(0, 7);

const MONTHS = {
  ru: [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ],
  uz: [
    'yanvar',
    'fevral',
    'mart',
    'aprel',
    'may',
    'iyun',
    'iyul',
    'avgust',
    'sentabr',
    'oktabr',
    'noyabr',
    'dekabr',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

/** Day and month as people write it: "15 октября", "15-oktabr", "15 October". */
export function dayMonth(ms) {
  const [, month, day] = localDate(ms).split('-').map(Number);
  return {
    ru: `${day} ${MONTHS.ru[month - 1]}`,
    uz: `${day}-${MONTHS.uz[month - 1]}`,
    en: `${day} ${MONTHS.en[month - 1]}`,
  };
}
