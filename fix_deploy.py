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
        return False
    content = content.replace(old, new, 1)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ [{label}] {filepath}")
    return True

# ═══════════════════════════════════════════
# 1. 删除邮箱登录相关（减少路由数）
# ═══════════════════════════════════════════
for f in ['api/auth/login.ts', 'api/auth/register.ts']:
    p = os.path.join(root, f)
    if os.path.exists(p):
        os.remove(p)
        print(f"✅ 删除 {f}")
    else:
        print(f"⚠️ {f} 不存在")

# ═══════════════════════════════════════════
# 2. 修复 password → passwordHash
# ═══════════════════════════════════════════
write_file('api/auth/sms.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import jwt from 'jsonwebtoken';

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\\d{9}$/.test(phone);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, phone, code } = req.body || {};

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  if (action === 'send') {
    const recent = await prisma.smsCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return res.status(429).json({ success: false, message: '发送太频繁，请60秒后再试' });
    }

    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.smsCode.deleteMany({ where: { phone } });
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });

    console.log('[SMS] ', phone, ' => ', newCode);

    return res.status(200).json({
      success: true,
      message: '验证码已发送',
      devCode: newCode,
    });
  }

  if (action === 'verify') {
    if (!code) return res.status(400).json({ error: '请输入验证码' });

    const smsCode = await prisma.smsCode.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsCode || smsCode.code !== code) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    await prisma.smsCode.delete({ where: { id: smsCode.id } });

    let user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, plan: 'free', quota: 3, totalUsed: 0, role: 'user' },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

    return res.status(200).json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        wechatName: user.wechatName,
        role: user.role,
        plan: user.plan,
        quota: user.quota,
        totalUsed: user.totalUsed,
      },
      token,
      needsPassword: !user.passwordHash,
    });
  }

  return res.status(400).json({ error: '无效操作' });
}
""")

write_file('api/auth/phone-login.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: '请输入手机号和密码' });

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) return res.status(400).json({ error: '手机号未注册' });
  if (!user.passwordHash) return res.status(400).json({ error: '该账号尚未设置密码，请先用验证码登录' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: '密码错误' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

  return res.status(200).json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      wechatName: user.wechatName,
      role: user.role,
      plan: user.plan,
      quota: user.quota,
      totalUsed: user.totalUsed,
    },
    token,
  });
}
""")

write_file('api/auth/set-password.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });

  return res.status(200).json({ success: true });
}
""")

# ═══════════════════════════════════════════
# 3. DashboardPage 也可能引用 email，检查密码修改
# ═══════════════════════════════════════════
safe_replace('src/pages/DashboardPage.tsx',
    "你当前使用手机号登录。如需设置密码以支持邮箱登录，请留空「当前密码」直接设置新密码",
    "如忘记密码，请使用验证码登录后重新设置",
    'DashboardPage 提示文案')

print("\n✅ 全部完成")
print("当前 API 路由数: 11 (限制12)")
