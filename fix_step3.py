import os

# ============================================================
# 写入 api/payment/create.ts - 码支付版本
# ============================================================
payment_create = r'''import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import crypto from 'crypto';

const PLAN_PRICES: Record<string, { amount: number; quota: number; name: string }> = {
  basic: { amount: 29, quota: 50, name: '基础套餐' },
  pro: { amount: 99, quota: 300, name: '专业套餐' },
};

const EPAY_PID = process.env.EPAY_PID || '11177';
const EPAY_KEY = process.env.EPAY_KEY || 'LoUYaj45n4iQTf4yNdpT';
const EPAY_API = process.env.EPAY_API || 'https://xpay.com';

function buildSign(params: Record<string, string>, key: string): string {
  // 过滤空值和sign/sign_type，按ASCII排序，拼接，追加key，MD5
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b));
  const str = filtered.map(([k, v]) => `${k}=${v}`).join('&');
  return crypto.createHash('md5').update(str + key).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  // 查询订单状态
  if (req.method === 'GET') {
    const { orderId } = req.query;
    const order = await prisma.order.findFirst({
      where: { id: orderId as string, userId },
    });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    return res.status(200).json({ status: order.status });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { planKey, payType = 'alipay' } = req.body || {};
  const plan = PLAN_PRICES[planKey];
  if (!plan) return res.status(400).json({ error: '套餐不存在' });

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await prisma.order.create({
    data: { id: orderId, userId, planKey, amount: plan.amount, quota: plan.quota, status: 'PENDING' },
  });

  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') || '';

  // 构造码支付跳转参数
  const params: Record<string, string> = {
    pid: EPAY_PID,
    type: payType as string,
    out_trade_no: orderId,
    notify_url: `${siteUrl}/api/payment/notify`,
    return_url: `${siteUrl}/dashboard`,
    name: plan.name,
    money: plan.amount.toFixed(2),
    sitename: '学术改写引擎',
  };

  params.sign = buildSign(params, EPAY_KEY);
  params.sign_type = 'MD5';

  // 拼接跳转URL
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const payUrl = `${EPAY_API}/xpay/epay/submit.php?${query}`;

  return res.status(200).json({ orderId, payUrl });
}
'''

with open('api/payment/create.ts', 'w', encoding='utf-8') as f:
    f.write(payment_create)
print('✅ api/payment/create.ts 已替换为码支付版本')

# ============================================================
# 写入 api/payment/notify.ts - 码支付回调版本
# ============================================================
payment_notify = r'''import type { VercelRequest, VercelResponse } from '@vercel/node';
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
'''

with open('api/payment/notify.ts', 'w', encoding='utf-8') as f:
    f.write(payment_notify)
print('✅ api/payment/notify.ts 已替换为码支付版本')

print('\n第三步完成！')
