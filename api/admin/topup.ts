import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { isAdminUser } from '../_lib/constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminId = getUserFromRequest(req);
  if (!adminId) return res.status(401).json({ error: '请先登录' });

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin || !isAdminUser(admin.email, admin.role)) {
    return res.status(403).json({ error: '无权限' });
  }

  const { userId, amount, price, planKey, note } = req.body || {};
  if (!userId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: '参数错误' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const topup = await tx.topup.create({
      data: {
        userId,
        amount,
        price: price || 0,
        planKey: planKey || 'manual',
        note: note || '管理员手动充值',
      },
    });
    const user = await tx.user.update({
      where: { id: userId },
      data: { quota: { increment: amount } },
      select: { id: true, email: true, phone: true, quota: true },
    });
    return { topup, user };
  });

  return res.status(200).json(result);
}