/**
 * Tashkent geography and opening-hour presets.
 * `venues.district` stores the district key below (stable, translatable); the full localized
 * address lives in `venues.address`. Centres are approximate, used for member home locations.
 */
export const CITY = { ru: 'Ташкент', uz: 'Toshkent', en: 'Tashkent' };

/** Amir Temur square, the reference point of the "nearby" checks. */
export const CITY_CENTRE = { lat: 41.311, lng: 69.279 };

/** The bounding box every seeded venue must fall into. */
export const BBOX = { minLat: 41.25, maxLat: 41.37, minLng: 69.18, maxLng: 69.38 };

export const DISTRICTS = {
  yunusabad: {
    ru: 'Юнусабадский район',
    uz: 'Yunusobod tumani',
    en: 'Yunusabad District',
    lat: 41.352,
    lng: 69.288,
  },
  chilanzar: {
    ru: 'Чиланзарский район',
    uz: 'Chilonzor tumani',
    en: 'Chilanzar District',
    lat: 41.284,
    lng: 69.212,
  },
  'mirzo-ulugbek': {
    ru: 'Мирзо-Улугбекский район',
    uz: 'Mirzo Ulugʻbek tumani',
    en: 'Mirzo-Ulugbek District',
    lat: 41.326,
    lng: 69.33,
  },
  yakkasaray: {
    ru: 'Яккасарайский район',
    uz: 'Yakkasaroy tumani',
    en: 'Yakkasaray District',
    lat: 41.289,
    lng: 69.262,
  },
  mirabad: {
    ru: 'Мирабадский район',
    uz: 'Mirobod tumani',
    en: 'Mirabad District',
    lat: 41.3,
    lng: 69.284,
  },
  shaykhantahur: {
    ru: 'Шайхантахурский район',
    uz: 'Shayxontohur tumani',
    en: 'Shaykhantahur District',
    lat: 41.319,
    lng: 69.25,
  },
  sergeli: {
    ru: 'Сергелийский район',
    uz: 'Sergeli tumani',
    en: 'Sergeli District',
    lat: 41.256,
    lng: 69.229,
  },
  almazar: {
    ru: 'Алмазарский район',
    uz: 'Olmazor tumani',
    en: 'Almazar District',
    lat: 41.341,
    lng: 69.222,
  },
};

export const DISTRICT_KEYS = Object.keys(DISTRICTS);

/** Great-circle distance in metres (haversine, R = 6 371 km). */
export function distanceM(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** weekday (0 = Sunday) -> [[opens, closes], ...]; closes <= opens is an overnight slot. */
function week(rules) {
  const out = {};
  for (const [days, opens, closes] of rules) for (const day of days) out[day] = [[opens, closes]];
  return out;
}

export const HOURS = {
  gym: week([
    [WEEKDAYS, '06:00', '23:00'],
    [[6, 0], '08:00', '22:00'],
  ]),
  gym24: week([[ALL, '00:00', '24:00']]),
  pool: week([
    [[1, 2, 3, 4, 5, 6], '07:00', '22:00'],
    [[0], '08:00', '20:00'],
  ]),
  poolPremium: week([[ALL, '07:00', '22:00']]),
  studio: week([
    [WEEKDAYS, '07:00', '21:30'],
    [[6], '09:00', '18:00'],
    [[0], '09:00', '15:00'],
  ]),
  dance: week([
    [WEEKDAYS, '10:00', '22:00'],
    [[6, 0], '11:00', '19:00'],
  ]),
  combat: week([
    [[1, 2, 3, 4, 5, 6], '08:00', '21:30'],
    [[0], '10:00', '16:00'],
  ]),
  box: week([
    [WEEKDAYS, '06:30', '22:00'],
    [[6], '08:00', '18:00'],
    [[0], '09:00', '14:00'],
  ]),
  spa: week([[ALL, '10:00', '22:00']]),
  bath: week([[ALL, '09:00', '23:00']]),
  banya: week([
    [[0, 1, 2, 3, 4], '12:00', '23:00'],
    [[5, 6], '12:00', '02:00'],
  ]),
  care: week([[ALL, '09:00', '21:00']]),
  clinic: week([
    [[1, 2, 3, 4, 5, 6], '08:00', '20:00'],
    [[0], '09:00', '15:00'],
  ]),
  recovery: week([[ALL, '08:00', '22:00']]),
};
