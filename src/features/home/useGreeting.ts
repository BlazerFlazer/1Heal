import { useTranslation } from 'react-i18next';

import { firstName, greetingKey, greetingPeriod } from './greeting';

/** Localised time-of-day greeting, by first name when the profile has one. */
export function useGreeting(fullName: string | undefined, now: Date = new Date()): string {
  const { t } = useTranslation();
  const name = firstName(fullName);
  const period = greetingPeriod(now.getHours());
  return t(greetingKey(period, name !== undefined), { name });
}
