import { act, renderHook } from '@testing-library/react-native';

import { MINUS_SIGN, NBSP } from './chars';
import {
  createFormatters,
  formatCount,
  formatMoney,
  formatNumber,
  formatPhone,
  formatters,
  useFormatters,
} from './format';
import { i18n } from './i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** Thursday 8 October 2026, 09:05 local time. */
const oct8 = new Date(2026, 9, 8, 9, 5);
const oct12 = new Date(2026, 9, 12, 10, 30);

describe('formatNumber', () => {
  it('groups thousands with a no-break space (U+00A0), never a plain space', () => {
    expect(formatNumber(250000)).toBe(`250${NBSP}000`);
    expect(formatNumber(1234567)).toBe('1\u00A0234\u00A0567');
    expect(formatNumber(1000000)).not.toContain(' ');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(0)).toBe('0');
  });

  it('uses the typographic minus sign and rounds fractions', () => {
    expect(formatNumber(-1500)).toBe(`${MINUS_SIGN}1${NBSP}500`);
    expect(formatNumber(1999.6)).toBe(`2${NBSP}000`);
  });
});

describe('formatMoney', () => {
  it.each([
    ['ru', `250${NBSP}000${NBSP}сум`],
    ['uz', `250${NBSP}000${NBSP}so'm`],
    ['en', `250${NBSP}000${NBSP}UZS`],
  ] as const)('%s → %s', (locale, expected) => {
    expect(formatMoney(250000, locale)).toBe(expected);
  });

  it('formats zero and negative amounts', () => {
    expect(formatMoney(0, 'ru')).toBe(`0${NBSP}сум`);
    expect(formatMoney(-250000, 'ru')).toBe(`${MINUS_SIGN}250${NBSP}000${NBSP}сум`);
  });

  it('omits the currency on request', () => {
    expect(formatMoney(250000, 'ru', { withCurrency: false })).toBe(`250${NBSP}000`);
    expect(formatMoney(250000, 'en', { withCurrency: true })).toBe(`250${NBSP}000${NBSP}UZS`);
  });

  it('never shows decimals', () => {
    expect(formatMoney(1250000.4, 'en')).toBe('1\u00A0250\u00A0000\u00A0UZS');
  });
});

describe('formatPhone', () => {
  it('formats a Uzbek E.164 number for display', () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123 45 67');
    expect(formatPhone('+998331234567')).toBe('+998 33 123 45 67');
  });

  it.each(['+99890123456', '+9989012345678', '998901234567', '+79001234567', '', 'abc'])(
    'returns %p unchanged',
    (input) => {
      expect(formatPhone(input)).toBe(input);
    },
  );
});

describe('formatCount', () => {
  it.each([
    [1, '1 посещение'],
    [2, '2 посещения'],
    [4, '4 посещения'],
    [5, '5 посещений'],
    [11, '11 посещений'],
    [14, '14 посещений'],
    [21, '21 посещение'],
    [22, '22 посещения'],
    [25, '25 посещений'],
    [101, '101 посещение'],
  ])('ru %i → %s', (count, expected) => {
    expect(formatCount('common.units.visits', count, 'ru')).toBe(expected);
  });

  it('uses one/other in uz and en', () => {
    expect(formatCount('common.units.visits', 1, 'en')).toBe('1 visit');
    expect(formatCount('common.units.visits', 5, 'en')).toBe('5 visits');
    expect(formatCount('common.units.visits', 1, 'uz')).toBe('1 tashrif');
    expect(formatCount('common.units.visits', 5, 'uz')).toBe('5 tashrif');
  });

  it('handles the visitsLeft counter in every language', () => {
    expect(formatCount('common.units.visitsLeft', 3, 'ru')).toBe('Осталось 3 посещения');
    expect(formatCount('common.units.visitsLeft', 1, 'uz')).toBe('1 tashrif qoldi');
    expect(formatCount('common.units.visitsLeft', 1, 'en')).toBe('1 visit left');
  });

  it('follows the active language when no locale is given', async () => {
    await i18n.changeLanguage('ru');
    expect(formatCount('common.units.visits', 5)).toBe('5 посещений');
    await i18n.changeLanguage('en');
    expect(formatCount('common.units.visits', 5)).toBe('5 visits');
  });
});

describe('formatters and createFormatters', () => {
  it('exposes every formatter with an explicit locale', () => {
    expect(Object.keys(formatters).sort()).toEqual([
      'formatCount',
      'formatDate',
      'formatDateRange',
      'formatDuration',
      'formatMoney',
      'formatNumber',
      'formatPhone',
      'formatRelativeDay',
      'formatTime',
      'formatTimeRange',
    ]);
  });

  it('binds the locale into every function', () => {
    const uz = createFormatters('uz');
    expect(uz.locale).toBe('uz');
    expect(uz.formatNumber(1000)).toBe(`1${NBSP}000`);
    expect(uz.formatMoney(5000)).toBe(`5${NBSP}000${NBSP}so'm`);
    expect(uz.formatMoney(5000, { withCurrency: false })).toBe(`5${NBSP}000`);
    expect(uz.formatPhone('+998901234567')).toBe('+998 90 123 45 67');
    expect(uz.formatCount('common.units.visits', 2)).toBe('2 tashrif');
    expect(uz.formatDate(oct8, 'long')).toBe('8-oktabr, 2026');
    expect(uz.formatTime(oct8)).toBe('09:05');
    expect(uz.formatTimeRange(oct8, oct12)).toBe('09:05–10:30');
    expect(uz.formatRelativeDay(oct8, oct8)).toBe('Bugun');
    expect(uz.formatDateRange(oct8, oct12)).toBe('8–12-okt');
    expect(uz.formatDuration(60)).toBe(`1${NBSP}soat`);
  });
});

describe('useFormatters', () => {
  it('follows the active UI language and re-renders on change', async () => {
    await i18n.changeLanguage('ru');
    const { result } = await renderHook(() => useFormatters());
    expect(result.current.locale).toBe('ru');
    expect(result.current.formatMoney(1000)).toBe(`1${NBSP}000${NBSP}сум`);
    expect(result.current.formatDate(oct8, 'weekday')).toBe('четверг, 8 октября');

    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(result.current.locale).toBe('en');
    expect(result.current.formatMoney(1000)).toBe(`1${NBSP}000${NBSP}UZS`);
    expect(result.current.formatDate(oct8, 'weekday')).toBe('Thursday, 8 October');
  });
});
