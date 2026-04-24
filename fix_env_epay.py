import re

with open('.env', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'EPAY_API=https://pay.mzfpay.com'
new = 'EPAY_API=https://pay.mzfpay.com/xpay/epay'

if old in content and 'EPAY_API=https://pay.mzfpay.com/xpay/epay' not in content:
    content = content.replace(old, new)
    with open('.env', 'w', encoding='utf-8') as f:
        f.write(content)
    print('.env EPAY_API 路径已修正为完整路径')
elif 'EPAY_API=https://pay.mzfpay.com/xpay/epay' in content:
    print('.env 已经是正确的完整路径，无需修改')
else:
    print('未找到目标行，请手动检查 .env')
