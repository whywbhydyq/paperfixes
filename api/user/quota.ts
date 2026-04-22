import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma';
import { getUserFromRequest } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 认证检查
  const userId = getUserFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quota: true, totalUsed: true },
  });

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  return res.status(200).json({
    quota: user.quota,
    totalUsed: user.totalUsed,
  });
}
