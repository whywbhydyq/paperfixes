import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

const PLAN_PRICES: Record<string, { amount: number; quota: number; name: string }> = {
  basic: { amount: 29, quota: 50, name: '基础套餐' },
  pro: { amount: 99, quota: 300, name: '专业套餐' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  // GET /api/payment/create?orderId=xxx → 查询订单状态
  if (req.method === 'GET') {
    const { orderId } = req.query;
    const order = await prisma.order.findFirst({
      where: { id: orderId as string, userId },
    });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    return res.status(200).json({ status: order.status });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { planKey } = req.body || {};
  const plan = PLAN_PRICES[planKey];
  if (!plan) return res.status(400).json({ error: '套餐不存在' });

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await prisma.order.create({
    data: { id: orderId, userId, planKey, amount: plan.amount, quota: plan.quota, status: 'PENDING' },
  });

  const payjs_mchid = process.env.PAYJS_MCHID || '';
  const siteUrl = process.env.SITE_URL || '';

  if (!payjs_mchid) {
    return res.status(200).json({ orderId, payUrl: '', message: '支付功能尚未配置' });
  }

  const params = new URLSearchParams({
    mchid: payjs_mchid,
    out_trade_no: orderId,
    total_fee: String(plan.amount * 100),
    body: plan.name,
    notify_url: `${siteUrl}/api/payment/notify`,
    return_url: `${siteUrl}/dashboard`,
  });

  return res.status(200).json({
    orderId,
    payUrl: `https://payjs.cn/api/cashier?${params.toString()}`,
  });
}