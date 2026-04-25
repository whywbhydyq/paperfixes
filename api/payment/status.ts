import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 禁止 Vercel 边缘缓存
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  let order;
  try {
    order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { status: true },
    });
  } catch (err) {
    console.error('[状态] 查询失败:', err);
    return res.status(200).json({ status: 'PENDING' });
  }

  if (!order) {
    console.log('[状态] 订单不存在:', orderId);
    return res.status(200).json({ status: 'NOT_FOUND' });
  }

  console.log('[状态]', orderId, '=>', order.status);
  return res.status(200).json({ status: order.status });
}
