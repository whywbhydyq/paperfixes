import type { Prisma } from '@prisma/client';
import prisma from './prisma.js';

type RefundTx = Pick<Prisma.TransactionClient, 'job' | 'user'>;

export interface RefundClient {
  $transaction<T>(callback: (tx: RefundTx) => Promise<T>): Promise<T>;
}

export async function refundJobOnce(
  input: { jobId: string; userId: string; error: string; now?: Date },
  client: RefundClient = prisma,
): Promise<boolean> {
  return client.$transaction(async (tx) => {
    const failed = await tx.job.updateMany({
      where: {
        id: input.jobId,
        userId: input.userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: 'FAILED',
        error: input.error,
        doneAt: input.now ?? new Date(),
      },
    });
    if (failed.count !== 1) return false;

    const refunded = await tx.user.updateMany({
      where: { id: input.userId, totalUsed: { gt: 0 } },
      data: { quota: { increment: 1 }, totalUsed: { decrement: 1 } },
    });
    if (refunded.count !== 1) throw new Error('REFUND_USER_STATE_INVALID');
    return true;
  });
}

export function refundTimedOutJob(
  jobId: string,
  userId: string,
  now = new Date(),
  client: RefundClient = prisma,
) {
  return refundJobOnce({
    jobId,
    userId,
    error: '处理超时，额度已退还',
    now,
  }, client);
}
