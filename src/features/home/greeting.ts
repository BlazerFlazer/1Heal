export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/** Hour (0..23) at which each period starts; night wraps past midnight. */
export const GREETING_HOURS = { morning: 5, afternoon: 12, evening: 17, night: 22 } as const;

export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= GREETING_HOURS.night || hour < GREETING_HOURS.morning) return 'night';
  if (hour < GREETING_HOURS.afternoon) return 'morning';
  if (hour < GREETING_HOURS.evening) return 'afternoon';
  return 'evening';
}

/** First word of a full name, or `undefined` when there is nothing to greet by. */
export function firstName(fullName: string | undefined): string | undefined {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : undefined;
}

/** `home.greeting.<period>` takes `{{name}}`; the neutral variant greets without one. */
export function greetingKey(period: GreetingPeriod, hasName: boolean): string {
  return hasName ? `home.greeting.${period}` : `home.greeting.neutral.${period}`;
}
