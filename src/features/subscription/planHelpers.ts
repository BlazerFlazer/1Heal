import { upgradeCharge, type SubscriptionState } from '@/domain/membership';
import type { Plan, PlanCode } from '@/services/demo/types';
import type { PaymentProvider } from '@/services/membership/membershipStore';

/** Plans at or above this monthly quota are sold as unlimited (premium uses 99). */
export const UNLIMITED_VISITS = 99;
/** The plan highlighted with the "Popular" ribbon. */
export const POPULAR_PLAN: PlanCode = 'standard';
/** Simulated wait for the provider's confirmation in demo mode. */
export const PROCESSING_MS = 1500;
export const PROVIDERS: readonly PaymentProvider[] = ['payme', 'click', 'uzum'];

const PLAN_CODES: readonly string[] = ['basic', 'standard', 'premium'];

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === 'string' && PLAN_CODES.includes(value);
}

export function isUnlimited(plan: Pick<Plan, 'visitsPerMonth'>): boolean {
  return plan.visitsPerMonth >= UNLIMITED_VISITS;
}

export type PlanAction =
  | { kind: 'subscribe' }
  | { kind: 'current' }
  | { kind: 'upgrade'; charge: number }
  | { kind: 'downgrade' };

export type CurrentMembership = {
  active: boolean;
  plan: Plan | null;
  subscription: SubscriptionState | null;
};

/** What the plan card offers: subscribe, manage the current plan, or switch with proration. */
export function planAction(target: Plan, current: CurrentMembership, now: number): PlanAction {
  const { active, plan, subscription } = current;
  if (!active || plan === null || subscription === null) return { kind: 'subscribe' };
  if (plan.code === target.code) return { kind: 'current' };
  if (target.priceUzs > plan.priceUzs) {
    return { kind: 'upgrade', charge: upgradeCharge(plan, target, subscription, now) };
  }
  return { kind: 'downgrade' };
}
