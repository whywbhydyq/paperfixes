import os, shutil

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# #1: 修复数据库迁移 SQL —— 合并为单一 PostgreSQL 兼容迁移
# ============================================================
migrations_dir = os.path.join('prisma', 'migrations')
old_dirs = [
    '20260421125256_init',
    '20260421152720_add_admin_and_plans',
    '20260423000000_add_phone_topup',
    '20260424000000_fix_all_tables',
]

for d in old_dirs:
    path = os.path.join(migrations_dir, d)
    if os.path.exists(path):
        shutil.rmtree(path)
        print(f'[OK] 已删除旧迁移: {d}')
    else:
        print(f'[跳过] 不存在: {d}')

new_dir = os.path.join(migrations_dir, '20260427000000_init_clean')
os.makedirs(new_dir, exist_ok=True)

new_sql = r"""-- Clean init migration for PostgreSQL (idempotent)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "wechatOpenId" TEXT,
    "wechatName" TEXT,
    "wechatAvatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "quota" INTEGER NOT NULL DEFAULT 5,
    "totalUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inputLen" INTEGER,
    "outputLen" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Topup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "planKey" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Topup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Topup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SmsCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quota" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_wechatOpenId_key" ON "User"("wechatOpenId");
"""

with open(os.path.join(new_dir, 'migration.sql'), 'w', encoding='utf-8') as f:
    f.write(new_sql)
print(f'[OK] 已创建新迁移: 20260427000000_init_clean/migration.sql')

# ============================================================
# #2: 修复 DashboardPage 密码修改按钮 disabled 条件
# 手机用户无旧密码时需允许留空 oldPassword
# ============================================================
fpath = os.path.join('src', 'pages', 'DashboardPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

old_disabled = 'disabled={pwdLoading || !oldPassword || !newPassword || !confirmPassword}'
new_disabled = 'disabled={pwdLoading || !newPassword || !confirmPassword}'

if old_disabled in content:
    content = content.replace(old_disabled, new_disabled)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'[OK] DashboardPage.tsx: 密码修改按钮 disabled 条件已修复')
else:
    print(f'[警告] DashboardPage.tsx: 未找到目标文本，跳过')

# ============================================================
# #4: SMS 添加每日发送限制（同手机号每天最多10次）
# 同时将 deleteMany 改为只删过期记录，保留未过期记录供计数
# 验证逻辑用 findFirst + orderBy desc 取最新，不受影响
# ============================================================
fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

old_sms_block = """    if (recent) {
      return res.status(429).json({ success: false, message: '发送太频繁，请60秒后再试' });
    }

    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.smsCode.deleteMany({ where: { phone } });
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });"""

new_sms_block = """    if (recent) {
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

if old_sms_block in content:
    content = content.replace(old_sms_block, new_sms_block)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'[OK] sms.ts: 已添加每日发送限制(10次/天/手机号)，deleteMany 改为只删过期记录')
else:
    print(f'[警告] sms.ts: 未找到目标文本，跳过')

# ============================================================
# #5: 前端管理员判断去除硬编码邮箱，统一使用 role 字段
# 后端 isAdminUser 保留邮箱兜底，不动
# ============================================================
for fname, subdir in [('Navbar.tsx', 'components'), ('AdminPage.tsx', 'pages')]:
    fpath = os.path.join('src', subdir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_admin = "(user.role === 'admin' || user.email === '2922027393@qq.com')"
    new_admin = "user.role === 'admin'"

    if old_admin in content:
        content = content.replace(old_admin, new_admin)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[OK] {fname}: 管理员判断已统一为 role === "admin"')
    else:
        print(f'[警告] {fname}: 未找到目标文本，跳过')

# ============================================================
# #7: 专业套餐有效期从 90 天改为 30 天（代码逻辑已是30天，仅修文案）
# ============================================================
fpath = os.path.join('api', 'admin', 'index.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

old_feature = "'90 天有效'"
new_feature = "'30 天有效'"

if old_feature in content:
    content = content.replace(old_feature, new_feature)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'[OK] admin/index.ts: 专业套餐有效期文案已改为 30 天')
else:
    print(f'[警告] admin/index.ts: 未找到 "90 天有效"，跳过')

print('\n=== 批次1 完成 ===')
