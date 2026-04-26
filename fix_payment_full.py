import os

root = os.path.dirname(os.path.abspath(__file__))

def write_file(rel_path, content):
    abs_path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ 写入 {rel_path}")

def safe_replace(filepath, old, new, label=""):
    abs_path = os.path.join(root, filepath)
    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️ 文件不存在: {filepath}")
        return False
    if old not in content:
        print(f"⚠️ [{label}] 未找到 in {filepath}")
        print(f"   前80字符: {old[:80]!r}")
        return False
    content = content.replace(old, new, 1)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ [{label}] {filepath}")
    return True

ok = 0
fail = 0

# 清理：删除之前错误创建的文件
for f in ['api/_lib/db.ts']:
    p = os.path.join(root, f)
    if os.path.exists(p):
        os.remove(p)
        print(f"✅ 删除 {f}")

# ═══════════════════════════════════════════
# 1. api/payment/create.ts - 完整重写
# ═══════════════════════════════════════════
write_file('api/payment/create.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
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
      if (plan) return { price: plan.price, name: plan.name, quota: plan.quota };
    }
  } catch {}
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

  const pid  = process.env.EPAY_PID!;
  const key  = process.env.EPAY_KEY!;
  const base = process.env.EPAY_API!;
  const site = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';

  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
  const payUrl = `${base}submit.php?${new URLSearchParams({
    ...params, sign, sign_type: 'MD5',
  }).toString()}`;

  console.log(`[支付] 订单 ${orderId}, 用户 ${userId}, 套餐 ${planKey}, ${plan.price}元`);
  return res.status(200).json({ payUrl, orderId });
}
""")
ok += 1

# ═══════════════════════════════════════════
# 2. api/payment/notify.ts - 完整重写
# ═══════════════════════════════════════════
write_file('api/payment/notify.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  const params: Record<string, string> = {};

  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
      else if (Array.isArray(v)) params[k] = v[0];
    }
  }
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body)) {
      if (v != null && !params[k]) params[k] = String(v);
    }
  }

  const { trade_no, out_trade_no, trade_status, sign, money } = params;
  console.log(`[回调] order=${out_trade_no}, status=${trade_status}, trade_no=${trade_no}, money=${money}`);

  const key = process.env.EPAY_KEY!;
  const expectedSign = genSign(params, key);
  if (sign !== expectedSign) {
    console.warn('[回调] 签名不匹配', { expected: expectedSign, got: sign });
    return res.status(400).send('sign error');
  }

  if (trade_status !== 'TRADE_SUCCESS') {
    return res.send('success');
  }

  if (!out_trade_no) {
    return res.status(400).send('missing order id');
  }

  const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
  if (!order) {
    console.warn('[回调] 订单不存在:', out_trade_no);
    return res.status(400).send('order not found');
  }
  if (order.status === 'PAID') {
    return res.send('success');
  }

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
        note: `在线支付${trade_no ? ' ' + trade_no : ''}`,
      },
    });
  });

  console.log(`[回调] ✅ 用户 ${order.userId} +${order.quota}次, 订单 ${out_trade_no}`);
  return res.send('success');
}
""")
ok += 1

# ═══════════════════════════════════════════
# 3. api/payment/status.ts - 完整重写
# ═══════════════════════════════════════════
write_file('api/payment/status.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { status: true },
  });

  if (!order) {
    return res.status(200).json({ status: 'NOT_FOUND' });
  }

  return res.status(200).json({ status: order.status });
}
""")
ok += 1

# ═══════════════════════════════════════════
# 4. src/components/PaymentModal.tsx - 完整重写（去掉赞赏码自定义逻辑）
# ═══════════════════════════════════════════
write_file('src/components/PaymentModal.tsx', """import { useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  plan: {
    name: string;
    price: number;
    quota: number;
    planKey: string;
  } | null;
  onClose: () => void;
  onConfirm: (payType: 'alipay' | 'wxpay') => Promise<void>;
  pendingOrderId?: string | null;
  paySuccess?: boolean;
  onCheckPayment?: () => void;
}

export default function PaymentModal({ plan, onClose, onConfirm, pendingOrderId, paySuccess, onCheckPayment }: PaymentModalProps) {
  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay');
  const [loading, setLoading] = useState(false);

  if (!plan && !pendingOrderId && !paySuccess) return null;

  if (paySuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">支付成功</h3>
            <p className="mt-2 text-sm text-gray-500">额度已到账，可以开始改写了</p>
            <button onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
              开始使用
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingOrderId && !plan) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">等待支付</h3>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Loader2 size={24} className="text-amber-600 animate-spin" />
            </div>
            <p className="text-sm text-gray-600">支付页面已在新标签页打开</p>
            <p className="mt-1.5 text-xs text-primary-600 font-medium">系统正在自动检测支付状态，无需刷新...</p>
            <button onClick={onCheckPayment}
              className="mt-5 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
              我已完成支付
            </button>
            <button onClick={onClose}
              className="mt-2 w-full rounded-xl border border-gray-200 py-3 text-sm text-gray-500 hover:bg-gray-50">
              稍后再查
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(payType);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">确认订阅</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{plan.name}</span>
              <span className="text-lg font-bold text-gray-900">¥{plan.price}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{plan.quota} 次改写额度</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">选择支付方式</p>
            <button
              onClick={() => setPayType('alipay')}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                payType === 'alipay'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                payType === 'alipay' ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <span className="text-sm font-bold text-white">支</span>
              </div>
              <span className={`text-sm font-medium ${payType === 'alipay' ? 'text-blue-700' : 'text-gray-600'}`}>
                支付宝
              </span>
              {payType === 'alipay' && (
                <span className="ml-auto text-xs text-blue-600">✓</span>
              )}
            </button>

            <button
              onClick={() => setPayType('wxpay')}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                payType === 'wxpay'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                payType === 'wxpay' ? 'bg-green-600' : 'bg-gray-300'
              }`}>
                <span className="text-sm font-bold text-white">微</span>
              </div>
              <span className={`text-sm font-medium ${payType === 'wxpay' ? 'text-green-700' : 'text-gray-600'}`}>
                微信支付
              </span>
              {payType === 'wxpay' && (
                <span className="ml-auto text-xs text-green-600">✓</span>
              )}
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />跳转支付中...
              </span>
            ) : (
              `确认支付 ¥${plan.price}`
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            支付成功后额度即时到账
          </p>
        </div>
      </div>
    </div>
  );
}
""")
ok += 1

# ═══════════════════════════════════════════
# 5. src/App.tsx - 添加 useAuthStore import
# ═══════════════════════════════════════════
r = safe_replace('src/App.tsx',
    "import { useEffect } from 'react';\nimport Navbar from './components/Navbar';",
    "import { useEffect } from 'react';\nimport { useAuthStore } from './store/useAuthStore';\nimport Navbar from './components/Navbar';",
    'App.tsx 添加 useAuthStore import')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
# 6. src/pages/PricingPage.tsx - 清理赞赏码残留
# ═══════════════════════════════════════════
r = safe_replace('src/pages/PricingPage.tsx',
    "import { createPaymentOrder, pollPaymentStatus, fetchQuota, createTipOrder } from '../lib/api';",
    "import { createPaymentOrder, pollPaymentStatus, fetchQuota } from '../lib/api';",
    'PricingPage 移除 createTipOrder import')
ok += r; fail += (not r)

r = safe_replace('src/pages/PricingPage.tsx',
    """  const handleTipPaid = async (planKey: string) => {
    try {
      await createTipOrder(planKey, token);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '提交失败，请重试');
      throw err;
    }
  };

  const checkPayment""", "  const checkPayment",
    'PricingPage 移除 handleTipPaid')
ok += r; fail += (not r)

r = safe_replace('src/pages/PricingPage.tsx',
    """        onCheckPayment={() => checkPayment(false)}
        tipQrUrl={tipQrUrl}
        onTipPaid={handleTipPaid}
      />""",
    """        onCheckPayment={() => checkPayment(false)}
      />""",
    'PricingPage 移除 tipQrUrl/onTipPaid props')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
# 7. src/lib/api.ts - 移除 createTipOrder
# ═══════════════════════════════════════════
r = safe_replace('src/lib/api.ts',
    """

export async function createTipOrder(
  planKey: string,
  token: string | null
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/api/payment/tip', {
    method: 'POST',
    body: JSON.stringify({ planKey }),
  }, token);
}""",
    "",
    'api.ts 移除 createTipOrder')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
print(f"\n{'='*50}")
print(f"完成: ✅ {ok} 个写入/替换, ⚠️ {fail} 个失败")
if fail:
    print("请检查上方警告信息")
else:
    print("全部成功！")
