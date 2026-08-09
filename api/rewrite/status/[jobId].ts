import type { Job } from '@prisma/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/prisma.js';
import { getUserFromRequest } from '../../_lib/auth.js';
import { callRewriteAI } from '../../_lib/ai.js';
import { refundJobOnce, refundTimedOutJob } from '../../_lib/job-refund.js';

export const config = { maxDuration: 60 };

function sendStoredJob(res: VercelResponse, job: Job) {
  return res.status(200).json({
    status: job.status,
    result: job.outputText ?? undefined,
    error: job.error ?? undefined,
    inputLen: job.inputLen,
    outputLen: job.outputLen,
    doneAt: job.doneAt?.toISOString(),
  });
}

async function reloadOwnedJob(jobId: string, userId: string): Promise<Job | null> {
  return prisma.job.findFirst({ where: { id: jobId, userId } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const { jobId } = req.query;
  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: '缺少 jobId 参数' });
  }

  const job = await reloadOwnedJob(jobId, userId);
  if (!job) return res.status(404).json({ error: '任务不存在' });

  if (
    (job.status === 'PENDING' || job.status === 'PROCESSING')
    && Date.now() - job.createdAt.getTime() > 5 * 60 * 1000
  ) {
    await refundTimedOutJob(job.id, userId);
    const current = await reloadOwnedJob(job.id, userId);
    return current
      ? sendStoredJob(res, current)
      : res.status(404).json({ error: '任务不存在' });
  }

  if (job.status === 'PENDING') {
    const claimed = await prisma.job.updateMany({
      where: { id: job.id, userId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });
    if (claimed.count !== 1) {
      const current = await reloadOwnedJob(job.id, userId);
      return current
        ? sendStoredJob(res, current)
        : res.status(404).json({ error: '任务不存在' });
    }

    try {
      console.log(`[Job ${job.id}] 开始 AI 改写，原文 ${job.inputText.length} 字`);
      const aiResult = await callRewriteAI(job.inputText, job.id);
      const completed = await prisma.job.updateMany({
        where: { id: job.id, userId, status: 'PROCESSING' },
        data: {
          status: 'DONE',
          outputText: aiResult,
          outputLen: aiResult.length,
          doneAt: new Date(),
        },
      });
      if (completed.count !== 1) {
        const current = await reloadOwnedJob(job.id, userId);
        return current
          ? sendStoredJob(res, current)
          : res.status(404).json({ error: '任务不存在' });
      }

      console.log(`[Job ${job.id}] 改写完成，输出 ${aiResult.length} 字`);
      return res.status(200).json({
        status: 'DONE',
        result: aiResult,
        inputLen: job.inputLen,
        outputLen: aiResult.length,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'AI 处理失败';
      console.error(`[Job ${job.id}] 处理失败:`, errorMessage);
      await refundJobOnce({ jobId: job.id, userId, error: errorMessage });
      const current = await reloadOwnedJob(job.id, userId);
      return current
        ? sendStoredJob(res, current)
        : res.status(404).json({ error: '任务不存在' });
    }
  }

  return sendStoredJob(res, job);
}
