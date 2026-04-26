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
# 1. api/payment/status.ts - 禁止缓存 + 加日志
# ═══════════════════════════════════════════
with open(os.path.join(root, 'api/payment/status.ts'), 'w', encoding='utf-8') as f:
    f.write("""import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 禁止 Vercel 边缘缓存
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  let order;
  try {
    order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { status: true },
    });
  } catch (err) {
    console.error('[状态] 查询失败:', err);
    return res.status(200).json({ status: 'PENDING' });
  }

  if (!order) {
    console.log('[状态] 订单不存在:', orderId);
    return res.status(200).json({ status: 'NOT_FOUND' });
  }

  console.log('[状态]', orderId, '=>', order.status);
  return res.status(200).json({ status: order.status });
}
""")
print("✅ [status.ts 重写] api/payment/status.ts")
ok += 1

# ═══════════════════════════════════════════
# 2. api/payment/notify.ts - 也禁止缓存
# ═══════════════════════════════════════════
r = safe_replace('api/payment/notify.ts',
    "export default async function handler(req: VercelRequest, res: VercelResponse) {",
    "export default async function handler(req: VercelRequest, res: VercelResponse) {\n  // 禁止缓存\n  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');",
    'notify.ts 禁止缓存')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
# 3. src/lib/api.ts - 轮询加时间戳防浏览器缓存
# ═══════════════════════════════════════════
r = safe_replace('src/lib/api.ts',
    "  return request<PaymentStatusResponse>(`/api/payment/status?orderId=${orderId}`, {}, token);",
    "  return request<PaymentStatusResponse>(`/api/payment/status?orderId=${orderId}&_t=${Date.now()}`, {}, token);",
    'api.ts 轮询加时间戳')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
