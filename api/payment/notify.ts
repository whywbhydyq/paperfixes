import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { out_trade_no, return_code } = req.body || {};

  if (return_code !== 'SUCCESS') {
    return res.status(200).send('FAIL');
  }

  const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  if (!order || order.status === 'PAID') {
    return res.status(200).send('SUCCESS');
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: out_trade_no },
      data: { status: 'PAID', paidAt: new Date() },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: { quota: { increment: order.quota } },
    }),
    prisma.topup.create({
      data: {
        userId: order.userId,
        amount: order.quota,
        price: order.amount,
        planKey: order.planKey,
        note: `在线支付-${out_trade_no}`,
      },
    }),
  ]);

  return res.status(200).send('SUCCESS');
}