import os, shutil

# ============================================================
# Fix: create.ts + notify.ts - 移除硬编码默认值
# ============================================================
shutil.copy('api/payment/create.ts', '.backups/create.ts.bak4')
shutil.copy('api/payment/notify.ts', '.backups/notify.ts.bak4')

# create.ts
with open('api/payment/create.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "const EPAY_PID = process.env.EPAY_PID || '11177';",
    "const EPAY_PID = process.env.EPAY_PID || '';"
)
c = c.replace(
    "const EPAY_KEY = process.env.EPAY_KEY || 'LoUYaj45n4iQTf4yNdpT';",
    "const EPAY_KEY = process.env.EPAY_KEY || '';"
)

# 加启动检查
old_handler = """export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserFromRequest(req);"""
new_handler = """const EPAY_CONFIGURED = !!(process.env.EPAY_PID && process.env.EPAY_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!EPAY_CONFIGURED) {
    console.error('[Payment] EPAY_PID 或 EPAY_KEY 未配置');
    return res.status(500).json({ error: '支付未配置，请联系管理员' });
  }
  const userId = getUserFromRequest(req);"""

if old_handler in c:
    c = c.replace(old_handler, new_handler)
    print('✅ create.ts: 移除硬编码 + 加配置检查')
else:
    print('⚠️ create.ts: handler 未匹配')

with open('api/payment/create.ts', 'w', encoding='utf-8') as f:
    f.write(c)

# notify.ts
with open('api/payment/notify.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "const EPAY_PID = process.env.EPAY_PID || '11177';",
    "const EPAY_PID = process.env.EPAY_PID || '';"
)
c = c.replace(
    "const EPAY_KEY = process.env.EPAY_KEY || 'LoUYaj45n4iQTf4yNdpT';",
    "const EPAY_KEY = process.env.EPAY_KEY || '';"
)

with open('api/payment/notify.ts', 'w', encoding='utf-8') as f:
    f.write(c)
print('✅ notify.ts: 移除硬编码')

# ============================================================
# 验证
# ============================================================
print('\n--- 验证 ---')
with open('api/payment/create.ts', 'r', encoding='utf-8') as f:
    v = f.read()
print('✅ 无 11177' if '11177' not in v else '⚠️ 还有旧PID')
print('✅ 无旧KEY' if 'LoUYaj45n4iQTf4yNdpT' not in v else '⚠️ 还有旧KEY')
print('✅ 有配置检查' if 'EPAY_CONFIGURED' in v else '⚠️ 无检查')

with open('api/payment/notify.ts', 'r', encoding='utf-8') as f:
    v = f.read()
print('✅ 无 11177' if '11177' not in v else '⚠️ 还有旧PID')
print('✅ 无旧KEY' if 'LoUYaj45n4iQTf4yNdpT' not in v else '⚠️ 还有旧KEY')

os.remove('fix_epay_keys.py') if os.path.exists('fix_epay_keys.py') else None
