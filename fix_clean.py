import os

root = os.path.dirname(os.path.abspath(__file__))

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

ok = 0
fail = 0

# ═══════════════════════════════════════════
# 1. api/auth/sms.ts - 修正环境变量名
# ═══════════════════════════════════════════
r = safe_replace('api/auth/sms.ts',
    "const accessKeyId = process.env.ALI_SMS_ACCESS_KEY_ID;\n  const accessKeySecret = process.env.ALI_SMS_ACCESS_KEY_SECRET;\n  const signName = process.env.ALI_SMS_SIGN_NAME;\n  const templateCode = process.env.ALI_SMS_TEMPLATE_CODE;",
    "const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;\n  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;\n  const signName = process.env.ALIYUN_SMS_SIGN_NAME;\n  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;",
    'sms.ts 环境变量名')
ok += r; fail += (not r)

r = safe_replace('api/auth/sms.ts',
    "if (!accessKeyId || !accessKeySecret) {",
    "if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {",
    'sms.ts 检查所有变量')
ok += r; fail += (not r)

r = safe_replace('api/auth/sms.ts',
    "const isDev = !process.env.ALI_SMS_ACCESS_KEY_ID;",
    "const isDev = !process.env.ALIYUN_ACCESS_KEY_ID;",
    'sms.ts isDev 变量名')
ok += r; fail += (not r)

# ═══════════════════════════════════════════
# 2. 清理 DashboardPage 中的邮箱相关
# ═══════════════════════════════════════════
with open(os.path.join(root, 'src/pages/DashboardPage.tsx'), 'r', encoding='utf-8') as f:
    content = f.read()

# 移除邮箱显示相关代码
import re

# 找到邮箱相关行并移除
lines_to_remove = [
    '邮箱',
    'email',
    '邮箱登录',
    'emailLogin',
    'setEmailLogin',
]

# 简单处理：替换邮箱显示区域
if '邮箱' in content and '绑定邮箱' in content:
    print("⚠️ DashboardPage 有邮箱相关内容，需要手动检查")
else:
    print("✅ DashboardPage 无邮箱相关")

# ═══════════════════════════════════════════
# 3. 清理 api.ts 中邮箱登录相关
# ═══════════════════════════════════════════
with open(os.path.join(root, 'src/lib/api.ts'), 'r', encoding='utf-8') as f:
    content = f.read()

# 移除邮箱登录/注册函数
removed = []
for func_name in ['export async function login(', 'export async function register(']:
    if func_name in content:
        # 找到函数开始位置
        idx = content.index(func_name)
        # 找到下一个 export 的位置
        next_export = content.find('\nexport ', idx + 1)
        if next_export > 0:
            content = content[:idx] + content[next_export+1:]
            removed.append(func_name.split('(')[0].replace('export async function ', ''))

if removed:
    with open(os.path.join(root, 'src/lib/api.ts'), 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ api.ts 移除: {removed}")
else:
    print("⚠️ api.ts 无邮箱登录函数")

# ═══════════════════════════════════════════
# 4. 清理 Prisma Schema 中的 email 唯一约束（如果还有）
# ═══════════════════════════════════════════
schema_path = os.path.join(root, 'prisma', 'schema.prisma')
with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

if 'email    String?   @unique' in schema:
    schema = schema.replace('email    String?   @unique', 'email    String?')
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(schema)
    print("✅ schema.prisma 移除 email @unique")
elif 'email String? @unique' in schema:
    schema = schema.replace('email String? @unique', 'email String?')
    with open(schema_path, 'w', encoding='utf-8') as f:
        f.write(schema)
    print("✅ schema.prisma 移除 email @unique")
else:
    print("✅ schema.prisma email 已无 @unique")

print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
