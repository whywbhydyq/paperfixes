with open('api/payment/create.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换硬编码的 PLAN_PRICES 为动态查询
old = """const PLAN_PRICES: Record<string, { amount: number; quota: number; name: string }> = {
basic: { amount: 29, quota: 50, name: '基础套餐' },
  pro: { amount: 99, quota: 300, name: '专业套餐' },
};"""

new = """async function getPlanPrice(planKey: string): Promise<{ amount: number; quota: number; name: string } | null> {
  try {
    const config = await prisma.config.findUnique({ where: { key: 'pricing_plans' } });
    if (config) {
      const plans = JSON.parse(config.value);
      const found = plans.find((p: { planKey: string; price: number; quota: number; name: string; active: boolean }) => p.planKey === planKey && p.active);
      if (found) return { amount: found.price, quota: found.quota, name: found.name };
    }
  } catch {}
  // 兜底硬编码
  const fallback: Record<string, { amount: number; quota: number; name: string }> = {
    basic: { amount: 29, quota: 50, name: '基础套餐' },
    pro: { amount: 99, quota: 300, name: '专业套餐' },
  };
  return fallback[planKey] ?? null;
}"""

if old in content:
    content = content.replace(old, new)
    print('OK: 替换 PLAN_PRICES 为动态查询函数')
else:
    print('WARN: 未找到 PLAN_PRICES，检查缩进...')
    # 尝试去掉 basic 前的缩进差异
    old2 = "const PLAN_PRICES: Record<string, { amount: number; quota: number; name: string }> = {"
    if old2 in content:
        print('找到了开头，请手动处理或检查缩进')
    else:
        print('完全未找到 PLAN_PRICES')

# 替换使用 PLAN_PRICES 的地方
old_use = """  const { planKey, payType = 'alipay' } = req.body || {};
  const plan = PLAN_PRICES[planKey];
  if (!plan) return res.status(400).json({ error: '套餐不存在' });"""

new_use = """  const { planKey, payType = 'alipay' } = req.body || {};
  const plan = await getPlanPrice(planKey);
  if (!plan) return res.status(400).json({ error: '套餐不存在' });"""

if old_use in content:
    content = content.replace(old_use, new_use)
    print('OK: 替换 PLAN_PRICES 调用为 getPlanPrice')
else:
    print('WARN: 未找到 PLAN_PRICES 使用处')

with open('api/payment/create.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('=== Fix3 完成 ===')
