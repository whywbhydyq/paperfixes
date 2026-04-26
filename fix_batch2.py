import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# #6: genSign 去重 —— 新建 api/_lib/payment.ts
# ============================================================
payment_lib = os.path.join('api', '_lib', 'payment.ts')
payment_content = """import { createHash } from 'crypto';

export function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const sign = createHash('md5').update(str + key).digest('hex');
  console.log('[支付] 待签名字符串:', str + key);
  console.log('[支付] 签名结果:', sign);
  return sign;
}
"""
with open(payment_lib, 'w', encoding='utf-8') as f:
    f.write(payment_content)
print('[OK] 已创建 api/_lib/payment.ts')

# --- 修改 api/payment/create.ts ---
fpath = os.path.join('api', 'payment', 'create.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_imp1 = "import { createHash } from 'crypto';\nimport prisma from '../_lib/prisma.js';"
new_imp1 = "import prisma from '../_lib/prisma.js';\nimport { genSign } from '../_lib/payment.js';"
if old_imp1 in c:
    c = c.replace(old_imp1, new_imp1)
    changed = True
else:
    print('[警告] create.ts: 未找到 import 目标')

old_gs1 = """function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const sign = createHash('md5').update(str + key).digest('hex');
  console.log('[支付] 待签名字符串:', str + key);
  console.log('[支付] 签名结果:', sign);
  return sign;
}

async function getPlanConfig"""
new_gs1 = "async function getPlanConfig"
if old_gs1 in c:
    c = c.replace(old_gs1, new_gs1)
    changed = True
else:
    print('[警告] create.ts: 未找到 genSign 函数目标')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] create.ts: 已移除 genSign，改为 import')
else:
    print('[警告] create.ts: 无任何修改')

# --- 修改 api/payment/notify.ts ---
fpath = os.path.join('api', 'payment', 'notify.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_imp2 = "import { createHash } from 'crypto';\nimport prisma from '../_lib/prisma.js';"
new_imp2 = "import prisma from '../_lib/prisma.js';\nimport { genSign } from '../_lib/payment.js';"
if old_imp2 in c:
    c = c.replace(old_imp2, new_imp2)
    changed = True
else:
    print('[警告] notify.ts: 未找到 import 目标')

old_gs2 = """function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + key).digest('hex');
}

export default async function handler"""
new_gs2 = "export default async function handler"
if old_gs2 in c:
    c = c.replace(old_gs2, new_gs2)
    changed = True
else:
    print('[警告] notify.ts: 未找到 genSign 函数目标')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] notify.ts: 已移除 genSign，改为 import')
else:
    print('[警告] notify.ts: 无任何修改')

# ============================================================
# #7: 验证码竞态 —— 用 $transaction 包裹检查+创建
# ============================================================
fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_sms = """    const recent = await prisma.smsCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return res.status(429).json({ success: false, message: '发送太频繁，请60秒后再试' });
    }

    const dailyCount = await prisma.smsCode.count({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (dailyCount >= 10) {
      return res.status(429).json({ success: false, message: '该手机号今日发送次数已达上限，请明天再试' });
    }

    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.smsCode.deleteMany({ where: { phone, expiresAt: { lt: new Date() } } });
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });"""

new_sms = """    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
      await prisma.$transaction(async (tx) => {
        const recent = await tx.smsCode.findFirst({
          where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
          orderBy: { createdAt: 'desc' },
        });
        if (recent) {
          throw new Error('RATE_LIMIT_60S');
        }

        const dailyCount = await tx.smsCode.count({
          where: {
            phone,
            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });
        if (dailyCount >= 10) {
          throw new Error('RATE_LIMIT_DAILY');
        }

        await tx.smsCode.deleteMany({ where: { phone, expiresAt: { lt: new Date() } } });
        await tx.smsCode.create({ data: { phone, code: newCode, expiresAt } });
      });
    } catch (err: any) {
      if (err.message === 'RATE_LIMIT_60S') {
        return res.status(429).json({ success: false, message: '发送太频繁，请60秒后再试' });
      }
      if (err.message === 'RATE_LIMIT_DAILY') {
        return res.status(429).json({ success: false, message: '该手机号今日发送次数已达上限，请明天再试' });
      }
      throw err;
    }"""

if old_sms in c:
    c = c.replace(old_sms, new_sms)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] sms.ts: 已用 $transaction 包裹验证码检查+创建')
else:
    print('[警告] sms.ts: 未找到目标文本，跳过')

# ============================================================
# #9: JWT 401 拦截 —— api.ts 自动登出+弹登录框
# ============================================================
fpath = os.path.join('src', 'lib', 'api.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_401 = """  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {"""

new_401 = """  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    const { useAuthStore } = await import('../store/useAuthStore');
    const store = useAuthStore.getState();
    store.logout();
    store.openLoginModal();
    throw new Error('登录已过期，请重新登录');
  }
  if (!res.ok) {"""

if old_401 in c:
    c = c.replace(old_401, new_401, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api.ts: 已添加 401 拦截（自动登出+弹登录框）')
else:
    print('[警告] api.ts: 未找到 401 插入点，跳过')

# ============================================================
# #8: 死代码清理
# ============================================================

# 8a: App.tsx — 移除未使用的 LandingPage import
fpath = os.path.join('src', 'App.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
old_land = "import LandingPage from './pages/LandingPage';\n"
if old_land in c:
    c = c.replace(old_land, '')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] App.tsx: 已移除未使用的 LandingPage import')
else:
    print('[警告] App.tsx: 未找到 LandingPage import，跳过')

# 8b: api.ts — 移除未使用的 registerWithEmail / loginWithEmail
fpath = os.path.join('src', 'lib', 'api.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_dead = """export async function registerWithEmail(email: string, password: string) {
  return request<{ user: any; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithEmail(email: string, password: string) {
  return request<{ user: any; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function sendSmsCode"""
new_dead = "export async function sendSmsCode"

if old_dead in c:
    c = c.replace(old_dead, new_dead)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api.ts: 已移除未使用的 registerWithEmail / loginWithEmail')
else:
    print('[警告] api.ts: 未找到死代码，跳过')

# 8c: 删除 src/utils/cn.ts（全项目无引用）
cn_path = os.path.join('src', 'utils', 'cn.ts')
if os.path.exists(cn_path):
    os.remove(cn_path)
    print('[OK] 已删除 src/utils/cn.ts（全项目无引用）')
else:
    print('[警告] src/utils/cn.ts 不存在，跳过')

# 8d: package.json — 移除未使用的 dotenv 依赖
fpath = 'package.json'
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
old_dotenv = '    "dotenv": "^17.4.2",\n'
if old_dotenv in c:
    c = c.replace(old_dotenv, '')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] package.json: 已移除未使用的 dotenv 依赖')
else:
    print('[警告] package.json: 未找到 dotenv，跳过')

# ============================================================
# #10: GET config 区分鉴权
# ============================================================
fpath = os.path.join('api', 'admin', 'index.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_cfg = """  if (resource === 'config') {
    if (req.method === 'GET') {
      const plans = await ensureDefaultConfig();
      return res.status(200).json({ plans });
    }"""

new_cfg = """  if (resource === 'config') {
    if (req.method === 'GET') {
      const plans = await ensureDefaultConfig();
      const auth = await checkAdmin(req);
      if (auth.ok) {
        return res.status(200).json({ plans });
      }
      return res.status(200).json({ plans: plans.filter((p: { active: boolean }) => p.active) });
    }"""

if old_cfg in c:
    c = c.replace(old_cfg, new_cfg)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] admin/index.ts: GET config 已区分鉴权（管理员完整/非管理员仅 active）')
else:
    print('[警告] admin/index.ts: 未找到目标文本，跳过')

print('\n=== 批次2 完成 ===')
