import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import prisma from '../_lib/prisma.js';

// V1 MD5 验签：md5(str + KEY)
function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + key).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  console.log('[回调] 收到请求 method=', req.method, 'query=', JSON.stringify(req.query), 'body=', JSON.stringify(req.body));

  const params: Record<string, string> = {};

  // V1 回调用 GET
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
  console.log('[回调] order=', out_trade_no, 'status=', trade_status, 'trade_no=', trade_no, 'money=', money);

  const key = process.env.EPAY_KEY;
  if (!key) {
    console.error('[回调] EPAY_KEY 未配置');
    return res.status(500).send('config error');
  }
  const expectedSign = genSign(params, key);
  if (sign !== expectedSign) {
    console.warn('[回调] 签名不匹配 expected=', expectedSign, 'got=', sign);
    return res.status(400).send('sign error');
  }
  console.log('[回调] 签名验证通过');

  if (trade_status !== 'TRADE_SUCCESS') {
    console.log('[回调] 非成功状态，返回 success');
    return res.send('success');
  }

  if (!out_trade_no) {
    return res.status(400).send('missing order id');
  }

  let order;
  try {
    order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  } catch (err) {
    console.error('[回调] 查询订单失败:', err);
    return res.status(500).send('db error');
  }

  if (!order) {
    console.warn('[回调] 订单不存在:', out_trade_no);
    return res.status(400).send('order not found');
  }
  if (order.status === 'PAID') {
    console.log('[回调] 订单已处理过');
    return res.send('success');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: out_trade_no },
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
          note: '在线支付' + (trade_no ? ' ' + trade_no : ''),
        },
      });
    });
    console.log('[回调] ✅ 用户', order.userId, '+', order.quota, '次, 订单', out_trade_no);
  } catch (err) {
    console.error('[回调] 事务失败:', err);
    return res.status(500).send('db error');
  }

  return res.send('success');
}
