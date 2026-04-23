import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import crypto from 'crypto';

const EPAY_PID = process.env.EPAY_PID || '11177';
const EPAY_KEY = process.env.EPAY_KEY || 'LoUYaj45n4iQTf4yNdpT';

function buildSign(params: Record<string, string>, key: string): string {
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b));
  const str = filtered.map(([k, v]) => `${k}=${v}`).join('&');
  return crypto.createHash('md5').update(str + key).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 码支付支持GET/POST回调
  const data = req.method === 'POST' ? req.body : req.query;
  const {
    pid, trade_no, out_trade_no, type: payType,
    name, money, trade_status, sign, sign_type,
    ...rest
  } = data as Record<string, string>;

  // 验签
  const paramsToSign: Record<string, string> = {
    pid, trade_no, out_trade_no, type: payType,
    name, money, trade_status, ...rest,
  };
  const expectedSign = buildSign(paramsToSign, EPAY_KEY);
  if (sign !== expectedSign) {
    console.error('[Payment Notify] 签名验证失败', { sign, expectedSign });
    return res.status(200).send('FAIL');
  }

  if (trade_status !== 'TRADE_SUCCESS') {
    return res.status(200).send('FAIL');
  }

  if (pid !== EPAY_PID) {
    return res.status(200).send('FAIL');
  }

  const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  if (!order || order.status === 'PAID') {
    return res.status(200).send('success');
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

  console.log(`[Payment] 订单 ${out_trade_no} 支付成功，充值 ${order.quota} 次`);
  return res.status(200).send('success');
}
