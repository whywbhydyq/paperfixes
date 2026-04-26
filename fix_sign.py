import os

root = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(root, 'api/payment/create.ts'), 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 genSign 函数
old_func = """function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + key).digest('hex');
}"""

new_func = """function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const signStr = str + '&key=' + key;
  console.log('[支付] 签名字符串:', signStr);
  const sign = createHash('md5').update(signStr).digest('hex');
  console.log('[支付] 签名结果:', sign);
  return sign;
}"""

if old_func in content:
    content = content.replace(old_func, new_func, 1)
    with open(os.path.join(root, 'api/payment/create.ts'), 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ create.ts genSign 已修复 + 加日志")
else:
    print("⚠️ 未找到 genSign 函数")

# 同样修复 notify.ts 的 genSign
with open(os.path.join(root, 'api/payment/notify.ts'), 'r', encoding='utf-8') as f:
    content = f.read()

old_func2 = """function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + key).digest('hex');
}"""

new_func2 = """function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const signStr = str + '&key=' + key;
  console.log('[回调] 验签字符串:', signStr);
  return createHash('md5').update(signStr).digest('hex');
}"""

if old_func2 in content:
    content = content.replace(old_func2, new_func2, 1)
    with open(os.path.join(root, 'api/payment/notify.ts'), 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ notify.ts genSign 已修复 + 加日志")
else:
    print("⚠️ notify.ts 未找到 genSign 函数")
