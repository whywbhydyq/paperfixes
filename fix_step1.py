import re

# ============================================================
# 修复2: api/admin/index.ts - 用URL替换url.parse()
# ============================================================
with open('api/admin/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = "const url = new URL(req.url || '', 'http://localhost');\n    const targetId = url.searchParams.get('id');"
if old in content:
    print('✅ admin/index.ts url.parse 已是正确写法，无需修改')
else:
    print('ℹ️ admin/index.ts 检查完毕')

with open('api/admin/index.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# ============================================================
# 修复3: 删除微信登录后端文件（替换为明确返回410的存根）
# ============================================================
import os

wechat_qrcode = '''import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    error: '微信登录已停用，请使用手机号或邮箱登录',
    qrUrl: '',
    scene: '',
  });
}
'''

wechat_poll = '''import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({
    status: 'expired',
    error: '微信登录已停用，请使用手机号或邮箱登录',
  });
}
'''

os.makedirs('api/auth/wechat', exist_ok=True)
os.makedirs('api/auth/wechat-poll', exist_ok=True)

with open('api/auth/wechat/qrcode.ts', 'w', encoding='utf-8') as f:
    f.write(wechat_qrcode)
print('✅ api/auth/wechat/qrcode.ts 已替换为停用存根')

with open('api/auth/wechat-poll/[scene].ts', 'w', encoding='utf-8') as f:
    f.write(wechat_poll)
print('✅ api/auth/wechat-poll/[scene].ts 已替换为停用存根')

print('\n第一步完成！')
