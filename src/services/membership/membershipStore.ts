import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  cancellationOutcome,
  checkBooking,
  DAY_MS,
  PERIOD_DAYS,
  upgradeCharge,
  type BookingError,
  type BookingRecord,
  type BookingRequest,
  type SubscriptionState,
} from '@/domain/membership';
import { getPlan } from '@/services/demo/catalog';
import type { PlanCode } from '@/services/demo/types';

/**
 * Demo-mode membership ledger (ADR-032): subscription, payments and bookings per user, persisted
 * on the device. PROVIDER-STUB boundary: with Supabase these actions become rpc_* calls.
 */
export type PaymentProvider = 'payme' | 'click' | 'uzum';

export type PaymentRecord = {
  id: string;
  planCode: PlanCode;
  amountUzs: number;
  provider: PaymentProvider;
  kind: 'subscription' | 'upgrade';
  paidAt: number;
};

export type Membership = {
  subscription: SubscriptionState | null;
  bookings: BookingRecord[];
  payments: PaymentRecord[];
};

export const EMPTY_MEMBERSHIP: Membership = { subscription: null, bookings: [], payments: [] };

export type BookResult = { ok: true; booking: BookingRecord } | { ok: false; error: BookingError };

type MembershipState = {
  byUser: Record<string, Membership>;
  purchase: (userId: string, planCode: PlanCode, provider: PaymentProvider) => void;
  changePlan: (userId: string, planCode: PlanCode, provider: PaymentProvider) => number;
  setAutoRenew: (userId: string, autoRenew: boolean) => void;
  cancelSubscription: (userId: string) => void;
  book: (userId: string, request: BookingRequest) => BookResult;
  cancelBooking: (userId: string, bookingId: string, windowMin: number) => void;
  reset: (userId: string) => void;
};

let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export const useMembershipStore = create<MembershipState>()(
  persist(
    (set, get) => {
      const read = (userId: string): Membership => get().byUser[userId] ?? EMPTY_MEMBERSHIP;
      const write = (userId: string, next: Membership) =>
        set((state) => ({ byUser: { ...state.byUser, [userId]: next } }));

      return {
        byUser: {},
        purchase: (userId, planCode, provider) => {
          const plan = getPlan(planCode);
          if (!plan) return;
          const now = Date.now();
          const current = read(userId);
          write(userId, {
            ...current,
            subscription: {
              planCode,
              status: 'active',
              periodStart: now,
              periodEnd: now + PERIOD_DAYS * DAY_MS,
              autoRenew: true,
            },
            payments: [
              {
                id: newId('pay'),
                planCode,
                amountUzs: plan.priceUzs,
                provider,
                kind: 'subscription',
                paidAt: now,
              },
              ...current.payments,
            ],
          });
        },
        changePlan: (userId, planCode, provider) => {
          const current = read(userId);
          const sub = current.subscription;
          const from = sub ? getPlan(sub.planCode) : undefined;
          const to = getPlan(planCode);
          if (!sub || !from || !to) return 0;
          const charge = upgradeCharge(from, to, sub, Date.now());
          write(userId, {
            ...current,
            subscription: { ...sub, planCode, status: 'active', autoRenew: true },
            payments:
              charge > 0
                ? [
                    {
                      id: newId('pay'),
                      planCode,
                      amountUzs: charge,
                      provider,
                      kind: 'upgrade',
                      paidAt: Date.now(),
                    },
                    ...current.payments,
                  ]
                : current.payments,
          });
          return charge;
        },
        setAutoRenew: (userId, autoRenew) => {
          const current = read(userId);
          if (!current.subscription) return;
          write(userId, {
            ...current,
            subscription: {
              ...current.subscription,
              autoRenew,
              status: autoRenew ? 'active' : current.subscription.status,
            },
          });
        },
        cancelSubscription: (userId) => {
          const current = read(userId);
          if (!current.subscription) return;
          write(userId, {
            ...current,
            subscription: { ...current.subscription, status: 'cancelled', autoRenew: false },
          });
        },
        book: (userId, request) => {
          const current = read(userId);
          const sub = current.subscription;
          const plan = sub ? getPlan(sub.planCode) : undefined;
          const error = checkBooking(request, plan, sub, current.bookings, Date.now());
          if (error) return { ok: false, error };
          const booking: BookingRecord = {
            id: newId('bk'),
            venueId: request.venueId,
            sessionId: request.sessionId,
            startsAt: request.startsAt,
            endsAt: request.startsAt + 60 * 60_000,
            status: 'confirmed',
            createdAt: Date.now(),
          };
          write(userId, { ...current, bookings: [booking, ...current.bookings] });
          return { ok: true, booking };
        },
        cancelBooking: (userId, bookingId, windowMin) => {
          const current = read(userId);
          write(userId, {
            ...current,
            bookings: current.bookings.map((b) =>
              b.id === bookingId && b.status === 'confirmed'
                ? { ...b, status: cancellationOutcome(b, windowMin, Date.now()) }
                : b,
            ),
          });
        },
        reset: (userId) => write(userId, EMPTY_MEMBERSHIP),
      };
    },
    {
      name: 'membership-demo',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byUser: state.byUser }),
    },
  ),
);
