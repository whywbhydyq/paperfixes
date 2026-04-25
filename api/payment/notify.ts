import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import prisma from '../_lib/prisma.js';

function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + key).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const params: Record<string, string> = {};

  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
      else if (Array.isArray(v)) params[k] = v[0];
    }
  }
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body)) {
      if (v != null && !params[k]) params[k] = String(v);
    }
  }

  const { trade_no, out_trade_no, trade_status, sign, money } = params;
  console.log(`[回调] order=${out_trade_no}, status=${trade_status}, trade_no=${trade_no}, money=${money}`);

  const key = process.env.EPAY_KEY!;
  const expectedSign = genSign(params, key);
  if (sign !== expectedSign) {
    console.warn('[回调] 签名不匹配', { expected: expectedSign, got: sign });
    return res.status(400).send('sign error');
  }

  if (trade_status !== 'TRADE_SUCCESS') {
    return res.send('success');
  }

  if (!out_trade_no) {
    return res.status(400).send('missing order id');
  }

  const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  if (!order) {
    console.warn('[回调] 订单不存在:', out_trade_no);
    return res.status(400).send('order not found');
  }
  if (order.status === 'PAID') {
    return res.send('success');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: out_trade_no },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await tx.user.update({
      where: { id: order.userId },
      data: {
        quota: { increment: order.quota },
        plan: order.planKey,
      },
    });

    await tx.topup.create({
      data: {
        userId: order.userId,
        amount: order.quota,
        price: order.amount,
        planKey: order.planKey,
        note: `在线支付${trade_no ? ' ' + trade_no : ''}`,
      },
    });
  });

  console.log(`[回调] ✅ 用户 ${order.userId} +${order.quota}次, 订单 ${out_trade_no}`);
  return res.send('success');
}
