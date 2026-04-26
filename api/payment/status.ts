import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    return res.status(200).json({ status: 'NOT_FOUND' });
  }

  if (order.status === 'PAID') {
    return res.status(200).json({ status: 'PAID' });
  }

  if (order.status === 'PENDING') {
    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    if (elapsed > 10000) {
      try {
        const pid = process.env.EPAY_PID;
        const key = process.env.EPAY_KEY;
        const base = process.env.EPAY_API;

        if (pid && key && base) {
          const baseUrl = base.replace(/\/?$/, '/');
          const queryUrl = `${baseUrl}api.php?act=order&pid=${pid}&key=${key}&out_trade_no=${orderId}`;
          const queryRes = await fetch(queryUrl);
          const queryData = await queryRes.json();

          console.log('[状态同步] 平台返回:', JSON.stringify(queryData));

          if (queryData.code === 1 && queryData.status === 1) {
            const fresh = await prisma.order.findUnique({ where: { id: orderId } });
            if (fresh && fresh.status === 'PAID') {
              return res.status(200).json({ status: 'PAID' });
            }

            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: orderId },
                data: { status: 'PAID', paidAt: new Date() },
              });
              await tx.user.update({
                where: { id: order.userId },
                data: { quota: { increment: order.quota }, plan: order.planKey },
              });
              await tx.topup.create({
                data: {
                  userId: order.userId,
                  amount: order.quota,
                  price: order.amount,
                  planKey: order.planKey,
                  note: '在线支付(主动查询)' + (queryData.trade_no ? ' ' + queryData.trade_no : ''),
                },
              });
            });

            console.log('[状态同步] ✅ 用户', order.userId, '+', order.quota, '次');
            return res.status(200).json({ status: 'PAID' });
          }
        }
      } catch (err) {
        console.error('[状态同步] 查询平台失败:', err);
      }
    }
  }

  return res.status(200).json({ status: order.status });
}
