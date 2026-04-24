import re

with open('api/payment/create.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复 EPAY_API 默认值，保证路径完整
old = "const EPAY_API = (process.env.EPAY_API || 'https://pay.mzfpay.com/xpay/epay').replace(/\\/$/, '');"
new = "const EPAY_API = (process.env.EPAY_API?.replace(/\\/$/, '') || 'https://pay.mzfpay.com/xpay/epay');"

if old in content:
    content = content.replace(old, new)
    print('create.ts: EPAY_API 修复成功')
else:
    print('create.ts: 未找到目标字符串，请检查')

with open('api/payment/create.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 同步修复 notify.ts（无此问题，但统一环境变量读取）
with open('api/payment/notify.ts', 'r', encoding='utf-8') as f:
    content2 = f.read()
print('notify.ts: 无需修改')

print('完成！')
