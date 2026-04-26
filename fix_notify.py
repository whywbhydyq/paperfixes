import os

root = os.path.dirname(os.path.abspath(__file__))

def safe_replace(filepath, old, new, label=""):
    abs_path = os.path.join(root, filepath)
    with open(abs_path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        print(f"⚠️ [{label}] 未找到 in {filepath}")
        return False
    content = content.replace(old, new, 1)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ [{label}] {filepath}")
    return True

ok = 0
fail = 0

# ═══════════════════════════════════════════
# 1. PricingPage - onClose 清除 pendingOrderId + 停轮询
# ═══════════════════════════════════════════
r = safe_replace('src/pages/PricingPage.tsx',
    """      <PaymentModal
        plan={selectedPlan}
        onClose={() => { setSelectedPlan(null); setPaySuccess(false); }}
        onConfirm={handlePurchase}
        pendingOrderId={pendingOrderId}
        paySuccess={paySuccess}
        onCheckPayment={() => checkPayment(false)}
      />""",
    """      <PaymentModal
        plan={selectedPlan}
        onClose={() => {
          setSelectedPlan(null);
          setPaySuccess(false);
          setPendingOrderId(null);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }}
        onConfirm={handlePurchase}
        pendingOrderId={pendingOrderId}
        paySuccess={paySuccess}
        onCheckPayment={() => checkPayment(false)}
      />""",
    'PricingPage onClose 清除 pendingOrderId')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
# 2. api/payment/notify.ts - 加详细日志 + 容错
# ═══════════════════════════════════════════
with open(os.path.join(root, 'api/payment/notify.ts'), 'w', encoding='utf-8') as f:
    f.write("""import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  console.log('[回调] 收到请求 method=', req.method, 'query=', JSON.stringify(req.query), 'body=', JSON.stringify(req.body));

  const params: Record<string, string> = {};

  // 合并 query 参数（易支付可能用 GET）
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
      else if (Array.isArray(v) && v.length > 0) params[k] = v[0];
    }
  }
  // 合并 body 参数（易支付可能用 POST form）
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
      if (v != null && !params[k]) params[k] = String(v);
    }
  }

  const { trade_no, out_trade_no, trade_status, sign, money } = params;
  console.log('[回调] 解析后: order=', out_trade_no, 'status=', trade_status, 'trade_no=', trade_no, 'money=', money);

  // 验签
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

  // 非成功状态直接返回 success
  if (trade_status !== 'TRADE_SUCCESS') {
    console.log('[回调] 非成功状态, 直接返回 success');
    return res.send('success');
  }

  if (!out_trade_no) {
    return res.status(400).send('missing order id');
  }

  // 查订单
  let order;
  try {
    order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  } catch (err) {
    console.error('[回调] 查询订单失败(表可能不存在):', err);
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

  // 事务：更新订单 + 加额度 + 记充值
  try {
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
          note: '在线支付' + (trade_no ? ' ' + trade_no : ''),
        },
      });
    });
    console.log('[回调] ✅ 用户', order.userId, '+', order.quota, '次, 订单', out_trade_no);
  } catch (err) {
    console.error('[回调] 事务执行失败:', err);
    return res.status(500).send('db error');
  }

  return res.send('success');
}
""")
print("✅ [notify.ts 完整重写] api/payment/notify.ts")
ok += 1

# ═══════════════════════════════════════════
# 3. api/payment/create.ts - 加日志 + 容错
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
  return createHash('md5').update(str + key).digest('hex');
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

  const site = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    await prisma.order.create({
      data: {
        id: orderId,
        userId,
        planKey,
        amount: plan.price,
        quota: plan.quota,
        status: 'PENDING',
      },
    });
  } catch (err) {
    console.error('[支付] 创建订单失败(Order表可能不存在):', err);
    return res.status(500).json({ error: '创建订单失败，请运行 npx prisma db push' });
  }

  const params: Record<string, string> = {
    pid,
    type: payType === 'wxpay' ? 'wxpay' : 'alipay',
    out_trade_no: orderId,
    notify_url:  `${site}/api/payment/notify`,
    return_url:  `${site}/pricing?from_pay=1&order=${orderId}`,
    name:  plan.name,
    money: plan.price.toFixed(2),
  };

  const sign = genSign(params, key);
  // 确保 base 末尾有 /
  const baseUrl = base.replace(/\\/?$/, '/');
  const payUrl = `${baseUrl}submit.php?${new URLSearchParams({
    ...params, sign, sign_type: 'MD5',
  }).toString()}`;

  console.log(`[支付] 订单=${orderId} 用户=${userId} 套餐=${planKey} 金额=${plan.price} payUrl=${payUrl}`);
  return res.status(200).json({ payUrl, orderId });
}
""")
print("✅ [create.ts 完整重写] api/payment/create.ts")
ok += 1

# ═══════════════════════════════════════════
print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
