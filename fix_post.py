import os

root = os.path.dirname(os.path.abspath(__file__))

# ═══════════════════════════════════════════
# 1. api/payment/create.ts - 返回 submitUrl + params，不再拼 URL
# ═══════════════════════════════════════════
with open(os.path.join(root, 'api/payment/create.ts'), 'w', encoding='utf-8') as f:
    f.write("""import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + '&key=' + key).digest('hex');
}

async function getPlanConfig(planKey: string) {
  try {
    const config = await prisma.config.findUnique({ where: { key: 'pricing_plans' } });
    if (config) {
      const plans = JSON.parse(config.value);
      const plan = plans.find((p: { planKey: string; active: boolean }) => p.planKey === planKey && p.active);
      if (plan) return { price: Number(plan.price), name: plan.name, quota: Number(plan.quota) };
    }
  } catch (err) {
    console.error('[支付] 读取套餐配置失败:', err);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { planKey, payType } = req.body || {};
  if (!planKey) return res.status(400).json({ error: '缺少套餐参数' });

  const plan = await getPlanConfig(planKey);
  if (!plan) return res.status(400).json({ error: '无效套餐' });

  const pid  = process.env.EPAY_PID;
  const key  = process.env.EPAY_KEY;
  const base = process.env.EPAY_API;
  if (!pid || !key || !base) {
    console.error('[支付] 环境变量缺失 EPAY_PID/EPAY_KEY/EPAY_API');
    return res.status(500).json({ error: '支付配置错误' });
  }

  const site = (process.env.SITE_URL || '').replace(/\\/?$/, '') || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await prisma.order.create({
      data: { id: orderId, userId, planKey, amount: plan.price, quota: plan.quota, status: 'PENDING' },
    });
  } catch (err) {
    console.error('[支付] 创建订单失败:', err);
    return res.status(500).json({ error: '创建订单失败' });
  }

  const params: Record<string, string> = {
    pid,
    type: payType === 'wxpay' ? 'wxpay' : 'alipay',
    out_trade_no: orderId,
    notify_url:  `${site}/api/payment/notify`,
    return_url:  `${site}/pricing?from_pay=1&order=${orderId}`,
    name:  plan.name,
    money: plan.price.toFixed(2),
    timestamp: Math.floor(Date.now() / 1000).toString(),
  };

  const sign = genSign(params, key);
  const baseUrl = base.replace(/\\/?$/, '/');
  const submitUrl = `${baseUrl}submit`;

  console.log(`[支付] 订单=${orderId} 用户=${userId} 套餐=${planKey} 金额=${plan.price}`);
  return res.status(200).json({ submitUrl, params: { ...params, sign, sign_type: 'MD5' }, orderId });
}
""")
print("✅ api/payment/create.ts")

# ═══════════════════════════════════════════
# 2. src/lib/api.ts - 更新类型
# ═══════════════════════════════════════════
with open(os.path.join(root, 'src/lib/api.ts'), 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    """export interface CreatePaymentResponse {
  payUrl?: string;
  orderId?: string;
  error?: string;
}""",
    """export interface CreatePaymentResponse {
  submitUrl?: string;
  params?: Record<string, string>;
  orderId?: string;
  error?: string;
}"""
)

with open(os.path.join(root, 'src/lib/api.ts'), 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ src/lib/api.ts")

# ═══════════════════════════════════════════
# 3. src/pages/PricingPage.tsx - 用表单提交
# ═══════════════════════════════════════════
with open(os.path.join(root, 'src/pages/PricingPage.tsx'), 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    """      const data = await createPaymentOrder(selectedPlan.planKey, payType, token);
      if (data.payUrl && data.orderId) {
        setPendingOrderId(data.orderId);
        setSelectedPlan(null);
        window.open(data.payUrl, '_blank');
      } else {
        alert(data.error || '支付创建失败，请重试');
      }""",
    """      const data = await createPaymentOrder(selectedPlan.planKey, payType, token);
      if (data.submitUrl && data.params && data.orderId) {
        setPendingOrderId(data.orderId);
        setSelectedPlan(null);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.submitUrl;
        form.target = '_blank';
        for (const [k, v] of Object.entries(data.params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = v;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } else {
        alert(data.error || '支付创建失败，请重试');
      }"""
)

with open(os.path.join(root, 'src/pages/PricingPage.tsx'), 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ src/pages/PricingPage.tsx")

print("\n✅ 全部完成")
