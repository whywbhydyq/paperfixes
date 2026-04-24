import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import crypto from 'crypto';

// 兜底价格（数据库配置优先）
const FALLBACK_PRICES: Record<string, { amount: number; quota: number; name: string }> = {
  basic: { amount: 29, quota: 50, name: '基础套餐' },
  pro: { amount: 99, quota: 300, name: '专业套餐' },
};

async function getPlanPrice(planKey: string): Promise<{ amount: number; quota: number; name: string } | null> {
  try {
    const config = await prisma.config.findUnique({ where: { key: 'pricing_plans' } });
    if (config) {
      const plans = JSON.parse(config.value);
      const found = plans.find((p: { planKey: string; price: number; quota: number; name: string; active: boolean }) => p.planKey === planKey && p.active);
      if (found) return { amount: found.price, quota: found.quota, name: found.name };
    }
  } catch (e) {
    console.error('[getPlanPrice] 读取配置失败，使用兜底价格', e);
  }
  return FALLBACK_PRICES[planKey] ?? null;
}

const EPAY_PID = process.env.EPAY_PID || '';
const EPAY_KEY = process.env.EPAY_KEY || '';
const EPAY_API = process.env.EPAY_API || 'https://pay.mzfpay.com';

function buildSign(params: Record<string, string>, key: string): string {
  // 过滤空值和sign/sign_type，按ASCII排序，拼接，追加key，MD5
  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== '' && v != null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b));
  const str = filtered.map(([k, v]) => `${k}=${v}`).join('&');
  return crypto.createHash('md5').update(str + key).digest('hex');
}

const EPAY_CONFIGURED = !!(process.env.EPAY_PID && process.env.EPAY_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!EPAY_CONFIGURED) {
    console.error('[Payment] EPAY_PID 或 EPAY_KEY 未配置');
    return res.status(500).json({ error: '支付未配置，请联系管理员' });
  }
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
  const plan = await getPlanPrice(planKey);
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
