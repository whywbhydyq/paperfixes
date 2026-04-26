import os

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# #14a: schema.prisma 添加数据库索引
# ============================================================
fpath = os.path.join('prisma', 'schema.prisma')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

# Job: 在 doneAt 之后、} 之前加 @@index
old_job = """  doneAt     DateTime?
}

model Topup {"""
new_job = """  doneAt     DateTime?

  @@index([userId])
}

model Topup {"""
if old_job in c:
    c = c.replace(old_job, new_job)
    changed = True
    print('[OK] schema.prisma: Job @@index([userId])')
else:
    print('[警告] schema.prisma: 未找到 Job 目标')

# Topup: 在 createdAt 之后、} 之前加 @@index
old_topup = """  createdAt DateTime @default(now())
}

model Config {"""
new_topup = """  createdAt DateTime @default(now())

  @@index([userId])
}

model Config {"""
if old_topup in c:
    c = c.replace(old_topup, new_topup)
    changed = True
    print('[OK] schema.prisma: Topup @@index([userId])')
else:
    print('[警告] schema.prisma: 未找到 Topup 目标')

# SmsCode: 在 createdAt 之后、} 之前加 @@index
old_sms = """  createdAt DateTime @default(now())
}

model Order {"""
new_sms = """  createdAt DateTime @default(now())

  @@index([phone, expiresAt])
}

model Order {"""
if old_sms in c:
    c = c.replace(old_sms, new_sms)
    changed = True
    print('[OK] schema.prisma: SmsCode @@index([phone, expiresAt])')
else:
    print('[警告] schema.prisma: 未找到 SmsCode 目标')

# Order: 在 paidAt+createdAt 之后、文件末尾 } 之前加 @@index
old_order = """  paidAt    DateTime?
  createdAt DateTime  @default(now())
}"""
new_order = """  paidAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}"""
if old_order in c:
    c = c.replace(old_order, new_order)
    changed = True
    print('[OK] schema.prisma: Order @@index([userId])')
else:
    print('[警告] schema.prisma: 未找到 Order 目标')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
else:
    print('[警告] schema.prisma: 无任何修改')

# ============================================================
# #14b: 创建索引迁移 SQL
# ============================================================
idx_dir = os.path.join('prisma', 'migrations', '20260427000001_add_indexes')
os.makedirs(idx_dir, exist_ok=True)
idx_sql = """-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Job_userId_idx" ON "Job"("userId");
CREATE INDEX IF NOT EXISTS "Topup_userId_idx" ON "Topup"("userId");
CREATE INDEX IF NOT EXISTS "SmsCode_phone_expiresAt_idx" ON "SmsCode"("phone", "expiresAt");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
"""
with open(os.path.join(idx_dir, 'migration.sql'), 'w', encoding='utf-8') as f:
    f.write(idx_sql)
print('[OK] 已创建迁移: 20260427000001_add_indexes/migration.sql')

# ============================================================
# #15: phone-login.ts 复用 auth.ts 的 comparePassword / signToken
# ============================================================
fpath = os.path.join('api', 'auth', 'phone-login.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

old_imp = """import prisma from '../_lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';"""
new_imp = """import prisma from '../_lib/prisma.js';
import { comparePassword, signToken } from '../_lib/auth.js';"""
if old_imp in c:
    c = c.replace(old_imp, new_imp)
    changed = True
else:
    print('[警告] phone-login.ts: 未找到 import 目标')

old_bcrypt = "  const valid = await bcrypt.compare(password, user.passwordHash);"
new_bcrypt = "  const valid = await comparePassword(password, user.passwordHash);"
if old_bcrypt in c:
    c = c.replace(old_bcrypt, new_bcrypt)
    changed = True
else:
    print('[警告] phone-login.ts: 未找到 bcrypt.compare 目标')

old_jwt = "  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });"
new_jwt = "  const token = signToken(user.id);"
if old_jwt in c:
    c = c.replace(old_jwt, new_jwt)
    changed = True
else:
    print('[警告] phone-login.ts: 未找到 jwt.sign 目标')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] phone-login.ts: 已复用 auth.ts 的 comparePassword / signToken')
else:
    print('[警告] phone-login.ts: 无任何修改')

# ============================================================
# 安全修复: 后端"密码错误"从 401 改为 400
# 不改则批次2的 401 拦截器会把输错密码的用户登出
# ============================================================
fpath = os.path.join('api', 'user', 'index.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_pwd_401 = "if (!valid) return res.status(401).json({ error: '当前密码不正确' });"
new_pwd_400 = "if (!valid) return res.status(400).json({ error: '当前密码不正确' });"
if old_pwd_401 in c:
    c = c.replace(old_pwd_401, new_pwd_400)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] user/index.ts: 密码错误 401→400（避免触发前端 401 拦截器）')
else:
    print('[警告] user/index.ts: 未找到目标文本，跳过')

# ============================================================
# #21a: api.ts 添加 fetchJobs / changePassword / JobRecord
# ============================================================
fpath = os.path.join('src', 'lib', 'api.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_api_anchor = """export async function fetchTopups(token: string | null): Promise<{ topups: TopupRecord[] }> {
  return request<{ topups: TopupRecord[] }>('/api/user?action=topups', {}, token);
}


export interface CreatePaymentResponse {"""

new_api_anchor = """export async function fetchTopups(token: string | null): Promise<{ topups: TopupRecord[] }> {
  return request<{ topups: TopupRecord[] }>('/api/user?action=topups', {}, token);
}

export interface JobRecord {
  id: string;
  inputText: string;
  outputText: string | null;
  status: string;
  inputLen: number | null;
  outputLen: number | null;
  createdAt: string;
  doneAt: string | null;
}

export async function fetchJobs(token: string | null): Promise<{ jobs: JobRecord[] }> {
  return request<{ jobs: JobRecord[] }>('/api/user?action=jobs', {}, token);
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  token: string | null
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/user?action=password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  }, token);
}


export interface CreatePaymentResponse {"""

if old_api_anchor in c:
    c = c.replace(old_api_anchor, new_api_anchor)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] api.ts: 已添加 JobRecord / fetchJobs / changePassword')
else:
    print('[警告] api.ts: 未找到插入点，跳过')

# ============================================================
# #21b: DashboardPage 统一使用 api.ts
# ============================================================
fpath = os.path.join('src', 'pages', 'DashboardPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()
changed = False

# 1. 更新 import
old_d_imp = "import { fetchQuota, fetchTopups, type TopupRecord } from '../lib/api';"
new_d_imp = "import { fetchQuota, fetchTopups, fetchJobs, changePassword, type TopupRecord, type JobRecord } from '../lib/api';"
if old_d_imp in c:
    c = c.replace(old_d_imp, new_d_imp)
    changed = True
else:
    print('[警告] DashboardPage.tsx: 未找到 import 目标')

# 2. 移除 API_BASE 常量 + 本地 JobRecord 接口
old_d_local = """const API_BASE = import.meta.env.VITE_API_BASE || '';

interface JobRecord {
  id: string;
  inputText: string;
  outputText: string | null;
  status: string;
  inputLen: number | null;
  outputLen: number | null;
  createdAt: string;
  doneAt: string | null;
}

type ActiveTab = 'history' | 'topups' | 'password';"""
new_d_local = """type ActiveTab = 'history' | 'topups' | 'password';"""
if old_d_local in c:
    c = c.replace(old_d_local, new_d_local)
    changed = True
else:
    print('[警告] DashboardPage.tsx: 未找到 API_BASE/JobRecord 块')

# 3. 替换 loadJobs
old_load = """  const loadJobs = async () => {
    if (!token) return;
    setJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user?action=jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {}
    setJobsLoading(false);
  };"""
new_load = """  const loadJobs = async () => {
    if (!token) return;
    setJobsLoading(true);
    try {
      const data = await fetchJobs(token);
      setJobs(data.jobs || []);
    } catch {}
    setJobsLoading(false);
  };"""
if old_load in c:
    c = c.replace(old_load, new_load)
    changed = True
else:
    print('[警告] DashboardPage.tsx: 未找到 loadJobs 目标')

# 4. 替换 handleChangePassword 中的 fetch 调用
old_pwd_fetch = """    try {
      const res = await fetch(`${API_BASE}/api/user?action=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '修改失败');
      setPwdMsg('密码修改成功');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setPwdLoading(false);
    }"""
new_pwd_fetch = """    try {
      await changePassword(oldPassword, newPassword, token);
      setPwdMsg('密码修改成功');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setPwdLoading(false);
    }"""
if old_pwd_fetch in c:
    c = c.replace(old_pwd_fetch, new_pwd_fetch)
    changed = True
else:
    print('[警告] DashboardPage.tsx: 未找到 handleChangePassword fetch 目标')

if changed:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] DashboardPage.tsx: 已统一使用 api.ts（移除 raw fetch + API_BASE + 本地 JobRecord）')
else:
    print('[警告] DashboardPage.tsx: 无任何修改')

# ============================================================
# #8补: 删除 LandingPage.tsx（全项目无 import、无路由引用）
# ============================================================
lp = os.path.join('src', 'pages', 'LandingPage.tsx')
if os.path.exists(lp):
    os.remove(lp)
    print('[OK] 已删除 src/pages/LandingPage.tsx（死代码，无引用）')
else:
    print('[警告] src/pages/LandingPage.tsx 不存在，跳过')

print('\n=== 批次3 完成 ===')
