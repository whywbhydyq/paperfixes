with open('.env', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('EPAY_API=https://xpay.com', 'EPAY_API=https://pay.mzfpay.com')
with open('.env', 'w', encoding='utf-8') as f:
    f.write(c)
print('✅ .env EPAY_API 修复')

# 同步检查 api/payment/create.ts 里的默认值
with open('api/payment/create.ts', 'r', encoding='utf-8') as f:
    c2 = f.read()
c2 = c2.replace("https://xpay.com", "https://pay.mzfpay.com")
with open('api/payment/create.ts', 'w', encoding='utf-8') as f:
    f.write(c2)
print('✅ create.ts EPAY_API 修复')

# 同步 notify.ts
with open('api/payment/notify.ts', 'r', encoding='utf-8') as f:
    c3 = f.read()
# notify.ts 里没有 EPAY_API，但检查一下
if 'xpay.com' in c3:
    c3 = c3.replace("https://xpay.com", "https://pay.mzfpay.com")
    with open('api/payment/notify.ts', 'w', encoding='utf-8') as f:
        f.write(c3)
    print('✅ notify.ts EPAY_API 修复')
else:
    print('ℹ️ notify.ts 无需修改')
