import os

root = os.path.dirname(os.path.abspath(__file__))

def safe_replace(filepath, old, new, label=""):
    abs_path = os.path.join(root, filepath)
    with open(abs_path, 'r', encoding='utf-8') as f:
        content = f.read()
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
# api/payment/create.ts - 用 SITE_URL 替代 VERCEL_URL
# ═══════════════════════════════════════════
r = safe_replace('api/payment/create.ts',
    "const site = process.env.VERCEL_URL\n    ? `https://${process.env.VERCEL_URL}`\n    : 'http://localhost:5173';",
    "const site = (process.env.SITE_URL || '').replace(/\\/?$/, '') || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');",
    'create.ts 用 SITE_URL')
ok += r; fail += (not r)

print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
