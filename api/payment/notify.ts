import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { genSign } from '../_lib/payment.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const params: Record<string, string> = {};
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
      else if (Array.isArray(v) && v.length > 0) params[k] = v[0];
    }
  }
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
      if (v != null && !params[k]) params[k] = String(v);
    }
  }

  const { trade_no, out_trade_no, trade_status, sign, money } = params;
  console.log('[回调] order=', out_trade_no, 'status=', trade_status);

  const key = process.env.EPAY_KEY;
  if (!key) return res.status(500).send('config error');
  if (sign !== genSign(params, key)) return res.status(400).send('sign error');
  if (trade_status !== 'TRADE_SUCCESS') return res.send('success');
  if (!out_trade_no) return res.status(400).send('missing order id');

  // 原子更新：只有 PENDING 才处理
  const updated = await prisma.order.updateMany({
    where: { id: out_trade_no, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });

  if (updated.count > 0) {
    const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
    if (order) {
      await prisma.user.update({
        where: { id: order.userId },
        data: { quota: { increment: order.quota }, plan: order.planKey },
      });
      await prisma.topup.create({
        data: {
          userId: order.userId,
          amount: order.quota,
          price: order.amount,
          planKey: order.planKey,
          note: '在线支付' + (trade_no ? ' ' + trade_no : ''),
        },
      });
      console.log('[回调] ✅ 用户', order.userId, '+', order.quota, '次');
    }
  }

  return res.send('success');
}
