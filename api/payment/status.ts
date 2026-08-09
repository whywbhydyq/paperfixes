import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { ONLINE_PAYMENT_MAINTENANCE_MESSAGE } from '../../shared/payment-maintenance.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  return res.status(200).json({
    status: order?.status ?? 'NOT_FOUND',
    paymentAvailable: false,
    message: ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
  });
}
