import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { status: true },
  });

  if (!order) {
    return res.status(200).json({ status: 'NOT_FOUND' });
  }

  return res.status(200).json({ status: order.status });
}
