import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma';
import { getUserFromRequest } from '../_lib/auth';

async function getPlanLimits(plan: string): Promise<{ minChars: number; maxChars: number }> {
  try {
    const config = await prisma.config.findUnique({ where: { key: 'pricing_plans' } });
    if (config) {
      const plans = JSON.parse(config.value);
      const found = plans.find((p: { planKey: string }) => p.planKey === plan);
      if (found) return { minChars: found.minChars || 40, maxChars: found.maxChars || 500 };
    }
  } catch { /* fallback to defaults */ }
  return { minChars: 40, maxChars: 500 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: '请输入需要改写的文本' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.quota <= 0) return res.status(403).json({ error: '额度不足，请前往定价页面购买' });

  const limits = await getPlanLimits(user.plan);
  const trimmed = text.trim();

  if (trimmed.length < limits.minChars) {
    return res.status(400).json({ error: `文本太短，请至少输入${limits.minChars}个字符` });
  }
  if (trimmed.length > limits.maxChars) {
    return res.status(400).json({ error: `当前套餐单次最多${limits.maxChars}字，请精简后重试或升级套餐` });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { quota: { decrement: 1 }, totalUsed: { increment: 1 } },
    });

    const job = await tx.job.create({
      data: { userId, inputText: trimmed, inputLen: trimmed.length, status: 'PENDING' },
    });

    return { job, user: updatedUser };
  });

  return res.status(200).json({
    jobId: result.job.id,
    quota: result.user.quota,
    maxChars: limits.maxChars,
  });
}
