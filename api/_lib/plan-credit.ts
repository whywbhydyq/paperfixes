import type { Prisma } from '@prisma/client';
import { calculateExtendedExpiry } from './plan-entitlements.js';

export type PlanCreditTransaction = Pick<Prisma.TransactionClient, 'user' | 'topup'>;

export interface PlanCreditInput {
  userId: string;
  planKey: string;
  quota: number;
  price: number;
  note: string;
  effectiveAt: Date;
}

/**
 * Apply a paid-plan entitlement inside the caller's existing transaction.
 *
 * Order settlement and redemption-code settlement deliberately share this
 * function so quota replacement, 30-day stacking and the Topup audit record
 * cannot drift apart. The caller owns the surrounding atomic claim.
 */
export async function applyPlanCredit(
  tx: PlanCreditTransaction,
  input: PlanCreditInput,
) {
  const user = await tx.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const planExpiresAt = calculateExtendedExpiry(input.effectiveAt, user.planExpiresAt);
  const expiredPaidPlan = user.plan !== 'free'
    && user.planExpiresAt !== null
    && user.planExpiresAt <= input.effectiveAt;

  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: {
      quota: expiredPaidPlan ? input.quota : { increment: input.quota },
      plan: input.planKey,
      planExpiresAt,
    },
  });

  await tx.topup.create({
    data: {
      userId: user.id,
      amount: input.quota,
      price: input.price,
      planKey: input.planKey,
      note: input.note,
    },
  });

  return updatedUser;
}
