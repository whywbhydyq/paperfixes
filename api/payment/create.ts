import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import crypto from 'crypto';

const EPAY_PID = process.env.EPAY_PID || '11177';
const EPAY_KEY = process.env.EPAY_KEY || 'LoUYaj45n4iQTf4yNdpT';
const EPAY_API = (process.env.EPAY_API || 'https://pay.mzfpay.com/xpay/epay').replace(/\/$/, '');

// 兜底价格（数据库配置优先）
const FALLBACK_PRICES: Record<string, { amount: number; quota: number; name: string }> = {
  emergency: { amount: 9.9, quota: 5, name: '急救包' },
  basic: { amount: 49, quota: 30, name: '毕业包' },
  pro: { amount: 99, quota: 100, name: '全包通行' },
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

function buildSign(params: Record<string, string>, key: string): string {
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
  const plan = await getPlanPrice(planKey);
  if (!plan) return res.status(400).json({ error: '套餐不存在' });

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await prisma.order.create({
    data: { id: orderId, userId, planKey, amount: plan.amount, quota: plan.quota, status: 'PENDING' },
  });

  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') || 'https://react-rewrite-application-architect.vercel.app';

  // 构造易支付参数（mapi.php 服务器POST方式）
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

  // 服务器端 POST 请求 mapi.php
  const formBody = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  console.log(`[Payment Create] orderId=${orderId} plan=${planKey} amount=${plan.amount} payType=${payType}`);

  try {
    const epayRes = await fetch(`${EPAY_API}/mapi.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });

    const epayData = await epayRes.json();
    console.log('[Payment Create] 易支付返回:', JSON.stringify(epayData));

    if (epayData.code === 1 && (epayData.payurl || epayData.qrcode || epayData.urlscheme)) {
      const payUrl = epayData.payurl || epayData.qrcode || epayData.urlscheme;
      return res.status(200).json({ orderId, payUrl });
    } else {
      console.error('[Payment Create] 易支付失败:', JSON.stringify(epayData));
      // 删除刚创建的订单
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
      return res.status(500).json({ error: epayData.msg || '支付通道暂不可用，请稍后重试' });
    }
  } catch (err) {
    console.error('[Payment Create] 请求易支付失败:', err);
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    return res.status(500).json({ error: '支付服务连接失败，请稍后重试' });
  }
}
