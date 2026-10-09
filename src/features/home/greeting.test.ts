import { firstName, greetingKey, greetingPeriod } from './greeting';

describe('greetingPeriod', () => {
  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
  ] as const)('maps hour %i to %s', (hour, period) => {
    expect(greetingPeriod(hour)).toBe(period);
  });
});

describe('firstName', () => {
  it('takes the first word and ignores surrounding whitespace', () => {
    expect(firstName('  Азиза   Каримова ')).toBe('Азиза');
    expect(firstName('Oybek')).toBe('Oybek');
  });

  it('is undefined for missing or blank names', () => {
    expect(firstName(undefined)).toBeUndefined();
    expect(firstName('   ')).toBeUndefined();
  });
});

describe('greetingKey', () => {
  it('picks the named or the neutral variant', () => {
    expect(greetingKey('morning', true)).toBe('home.greeting.morning');
    expect(greetingKey('night', false)).toBe('home.greeting.neutral.night');
  });
});
