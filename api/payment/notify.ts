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
  // \u6613\u652f\u4ed8\u652f\u6301 GET/POST \u56de\u8c03
  const data = req.method === 'POST' ? req.body : req.query;

  console.log('[Payment Notify] 收到回调:', JSON.stringify(data));

  const {
    pid, trade_no, out_trade_no, type: payType,
    name, money, trade_status, sign, sign_type,
    ...rest
  } = data as Record<string, string>;

  // \u57fa\u672c\u53c2\u6570\u68c0\u67e5
  if (!out_trade_no || !sign) {
    console.error('[Payment Notify] 缺少必要参数');
    return res.status(200).send('FAIL');
  }

  // \u9a8c\u7b7e
  const paramsToSign: Record<string, string> = {
    pid: pid || '', trade_no: trade_no || '', out_trade_no,
    type: payType || '', name: name || '', money: money || '',
    trade_status: trade_status || '',
  };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== '' && v != null) paramsToSign[k] = String(v);
  }

  const expectedSign = buildSign(paramsToSign, EPAY_KEY);
  if (sign !== expectedSign) {
    console.error('[Payment Notify] 签名验证失败', { sign, expectedSign });
    return res.status(200).send('FAIL');
  }

  if (trade_status !== 'TRADE_SUCCESS') {
    console.log('[Payment Notify] 交易状态非成功:', trade_status);
    return res.status(200).send('FAIL');
  }

  if (pid && pid !== EPAY_PID) {
    console.error('[Payment Notify] PID 不匹配', { pid, EPAY_PID });
    return res.status(200).send('FAIL');
  }

  const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  if (!order) {
    console.error('[Payment Notify] 订单不存在:', out_trade_no);
    return res.status(200).send('FAIL');
  }
  if (order.status === 'PAID') {
    console.log('[Payment Notify] 订单已处理:', out_trade_no);
    return res.status(200).send('success');
  }

  // \u91d1\u989d\u6821\u9a8c\uff08\u5141\u8bb8\u9012\u589e\u91d1\u989d\u5dee\u503c < 1\u5143\uff09
  const paidAmount = parseFloat(money || '0');
  const orderAmount = order.amount;
  if (paidAmount < orderAmount - 0.01 || paidAmount - orderAmount >= 1) {
    console.error('[Payment Notify] \u91d1\u989d不匹配', { paidAmount, orderAmount });
    return res.status(200).send('FAIL');
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
        price: paidAmount,
        planKey: order.planKey,
        note: `在线支付-${out_trade_no}`,
      },
    }),
  ]);

  console.log(`[Payment] ✅ 订单 ${out_trade_no} 支付成功，充值 ${order.quota} 次，实付 ¥${paidAmount}`);
  return res.status(200).send('success');
}
