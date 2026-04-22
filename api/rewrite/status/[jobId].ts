import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/prisma.js';
import { getUserFromRequest } from '../../_lib/auth.js';
import { callRewriteAI } from '../../_lib/ai.js';

// 最大函数执行时间（秒）。Vercel Pro 支持最高 300s，免费版最高 60s
export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. 认证检查
  const userId = getUserFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  // 2. 获取 jobId
  const { jobId } = req.query;
  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: '缺少 jobId 参数' });
  }

  // 3. 查询任务
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) {
    return res.status(404).json({ error: '任务不存在' });
  }

  // 4. 检查超时（超过 5 分钟）
  if (
    (job.status === 'PENDING' || job.status === 'PROCESSING') &&
    Date.now() - job.createdAt.getTime() > 5 * 60 * 1000
  ) {
    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: '处理超时，额度已退还', doneAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { quota: { increment: 1 }, totalUsed: { decrement: 1 } },
      }),
    ]);

    return res.status(200).json({ status: 'FAILED', error: '处理超时，额度已退还' });
  }

  // ============================================================
  // ★ 核心逻辑：首次轮询时触发 AI 处理
  // 这样即使在 Serverless 环境中也能正常工作
  // ============================================================
  if (job.status === 'PENDING') {
    // 先原子性地更新为 PROCESSING（防止并发重复处理）
    try {
      await prisma.job.update({
        where: { id: job.id, status: 'PENDING' }, // 条件更新：只有 PENDING 才更新
        data: { status: 'PROCESSING' },
      });
    } catch {
      // 如果更新失败（说明另一个请求已经在处理），直接返回当前状态
      const currentJob = await prisma.job.findUnique({ where: { id: job.id } });
      return res.status(200).json({
        status: currentJob?.status || 'PROCESSING',
        result: currentJob?.outputText ?? undefined,
        error: currentJob?.error ?? undefined,
        inputLen: currentJob?.inputLen,
        outputLen: currentJob?.outputLen,
      });
    }

    // 调用 AI 改写（同步等待结果）
    try {
      console.log(`[Job ${job.id}] 开始 AI 改写，原文 ${job.inputText.length} 字`);

      const aiResult = await callRewriteAI(job.inputText, job.id);

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'DONE',
          outputText: aiResult,
          outputLen: aiResult.length,
          doneAt: new Date(),
        },
      });

      console.log(`[Job ${job.id}] 改写完成，输出 ${aiResult.length} 字`);

      return res.status(200).json({
        status: 'DONE',
        result: aiResult,
        inputLen: job.inputLen,
        outputLen: aiResult.length,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'AI 处理失败';
      console.error(`[Job ${job.id}] 处理失败:`, errorMessage);

      // 失败时退还额度
      await prisma.$transaction([
        prisma.job.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: errorMessage, doneAt: new Date() },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { quota: { increment: 1 }, totalUsed: { decrement: 1 } },
        }),
      ]);

      return res.status(200).json({ status: 'FAILED', error: '处理失败，额度已退还' });
    }
  }

  // 5. 其他状态直接返回
  return res.status(200).json({
    status: job.status,
    result: job.outputText ?? undefined,
    error: job.error ?? undefined,
    inputLen: job.inputLen,
    outputLen: job.outputLen,
    doneAt: job.doneAt?.toISOString(),
  });
}
