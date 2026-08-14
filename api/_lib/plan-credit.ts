import type { Prisma } from '@prisma/client';
import { calculateExtendedExpiry } from './plan-entitlements.js';

export const PLAN_CHANGE_REQUIRES_EXPIRY_CODE = 'PLAN_CHANGE_REQUIRES_EXPIRY';

export type PlanCreditTransaction = Pick<
  Prisma.TransactionClient,
  'user' | 'topup' | '$queryRaw'
>;

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
  const userId = input.userId?.trim();
  if (!userId) throw new Error('PLAN_CREDIT_USER_INVALID');
  if (!input.planKey?.trim()) throw new Error('PLAN_CREDIT_PLAN_INVALID');
  if (!Number.isSafeInteger(input.quota) || input.quota <= 0) {
    throw new Error('PLAN_CREDIT_QUOTA_INVALID');
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('PLAN_CREDIT_PRICE_INVALID');
  }

  // Serialize plan changes for one user across different paid orders or
  // different redemption codes. Without this row lock, two concurrent valid
  // settlements could both calculate the same next expiry and lose 30 days.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const currentPaidPlanIsActive = user.plan !== 'free'
    && (user.planExpiresAt === null || user.planExpiresAt > input.effectiveAt);
  if (currentPaidPlanIsActive && user.plan !== input.planKey) {
    throw new Error(PLAN_CHANGE_REQUIRES_EXPIRY_CODE);
  }

  const expiredPaidPlan = user.plan !== 'free'
    && user.planExpiresAt !== null
    && user.planExpiresAt <= input.effectiveAt;
  const expiryBase = currentPaidPlanIsActive ? user.planExpiresAt : null;
  const planExpiresAt = calculateExtendedExpiry(input.effectiveAt, expiryBase);

  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: {
      quota: expiredPaidPlan ? input.quota : { increment: input.quota },
      plan: input.planKey,
      planExpiresAt,
    },
    select: {
      id: true,
      plan: true,
      quota: true,
      planExpiresAt: true,
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
