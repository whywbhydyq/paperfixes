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

# 在 params 里加 timestamp
r = safe_replace('api/payment/create.ts',
    """  const params: Record<string, string> = {
    pid,
    type: payType === 'wxpay' ? 'wxpay' : 'alipay',
    out_trade_no: orderId,
    notify_url:  `${site}/api/payment/notify`,
    return_url:  `${site}/pricing?from_pay=1&order=${orderId}`,
    name:  plan.name,
    money: plan.price.toFixed(2),
  };""",
    """  const params: Record<string, string> = {
    pid,
    type: payType === 'wxpay' ? 'wxpay' : 'alipay',
    out_trade_no: orderId,
    notify_url:  `${site}/api/payment/notify`,
    return_url:  `${site}/pricing?from_pay=1&order=${orderId}`,
    name:  plan.name,
    money: plan.price.toFixed(2),
    timestamp: Math.floor(Date.now() / 1000).toString(),
  };""",
    'create.ts 加 timestamp')
ok += r; fail += (not r)

print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
