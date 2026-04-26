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

# submit.php → submit（巴巴博用 /api/pay/submit 不是 /submit.php）
r = safe_replace('api/payment/create.ts',
    "const payUrl = `${baseUrl}submit.php?${new URLSearchParams({",
    "const payUrl = `${baseUrl}submit?${new URLSearchParams({",
    'create.ts: submit.php → submit')
ok += r; fail += (not r)

print(f"\n{'='*50}")
print(f"完成: ✅ {ok}, ⚠️ {fail}")
