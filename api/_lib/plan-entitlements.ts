import type { Prisma, User } from '@prisma/client';
import prisma from './prisma.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface PlanClient {
  user: {
    updateMany(args: Prisma.UserUpdateManyArgs): Promise<{ count: number }>;
    findUnique(args: { where: { id: string } }): Promise<User | null>;
  };
}

export function calculateExtendedExpiry(now: Date, currentExpiry: Date | null): Date {
  const base = currentExpiry && currentExpiry.getTime() > now.getTime()
    ? currentExpiry
    : now;
  return new Date(base.getTime() + THIRTY_DAYS_MS);
}

export async function enforcePlanExpiry(
  userId: string,
  now = new Date(),
  client: PlanClient = prisma,
): Promise<User> {
  await client.user.updateMany({
    where: {
      id: userId,
      plan: { not: 'free' },
      planExpiresAt: { not: null, lte: now },
    },
    data: {
      plan: 'free',
      quota: 0,
      planExpiresAt: null,
    },
  });

  const user = await client.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return user;
}

export async function expireAllDuePlans(
  now = new Date(),
  client: Pick<PlanClient, 'user'> = prisma,
): Promise<number> {
  const result = await client.user.updateMany({
    where: {
      plan: { not: 'free' },
      planExpiresAt: { not: null, lte: now },
    },
    data: {
      plan: 'free',
      quota: 0,
      planExpiresAt: null,
    },
  });
  return result.count;
}
