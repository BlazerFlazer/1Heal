import { useMemo } from 'react';

import { isActive, visitsLeft, visitsUsed } from '@/domain/membership';
import type { BookingRequest } from '@/domain/membership';
import { useAuthStore } from '@/services/auth/authStore';
import { getPlan } from '@/services/demo/catalog';
import type { Plan, PlanCode } from '@/services/demo/types';
import { useNow } from '@/shared/utils/useNow';

import {
  EMPTY_MEMBERSHIP,
  useMembershipStore,
  type BookResult,
  type Membership,
  type PaymentProvider,
} from './membershipStore';

export type MembershipView = Membership & {
  userId: string | null;
  plan: Plan | null;
  /** Subscription exists and its period has not ended (cancelled ones stay usable to the end). */
  active: boolean;
  visitsUsed: number;
  visitsLeft: number;
  purchase: (planCode: PlanCode, provider: PaymentProvider) => void;
  changePlan: (planCode: PlanCode, provider: PaymentProvider) => number;
  setAutoRenew: (autoRenew: boolean) => void;
  cancelSubscription: () => void;
  book: (request: BookingRequest) => BookResult;
  cancelBooking: (bookingId: string, windowMin: number) => void;
};

const NO_USER: BookResult = { ok: false, error: 'NO_SUBSCRIPTION' };

/** The signed-in member's subscription, bookings and payments with bound actions. */
export function useMembership(): MembershipView {
  const userId = useAuthStore((state) => state.session?.userId ?? null);
  const membership = useMembershipStore((state) =>
    userId ? (state.byUser[userId] ?? EMPTY_MEMBERSHIP) : EMPTY_MEMBERSHIP,
  );
  const store = useMembershipStore.getState;
  const now = useNow();

  return useMemo(() => {
    const sub = membership.subscription;
    const plan = sub ? (getPlan(sub.planCode) ?? null) : null;
    const active = isActive(sub, now);
    return {
      ...membership,
      userId,
      plan,
      active,
      visitsUsed: sub ? visitsUsed(membership.bookings, sub) : 0,
      visitsLeft: sub && plan ? visitsLeft(plan, membership.bookings, sub) : 0,
      purchase: (code, provider) => userId && store().purchase(userId, code, provider),
      changePlan: (code, provider) => (userId ? store().changePlan(userId, code, provider) : 0),
      setAutoRenew: (value) => userId && store().setAutoRenew(userId, value),
      cancelSubscription: () => userId && store().cancelSubscription(userId),
      book: (request) => (userId ? store().book(userId, request) : NO_USER),
      cancelBooking: (id, windowMin) => userId && store().cancelBooking(userId, id, windowMin),
    } as MembershipView;
  }, [membership, userId, store, now]);
}
