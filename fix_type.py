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

r = safe_replace('api/payment/status.ts',
    'if (queryData.code === 1 && queryData.status === 1) {',
    'if (queryData.code === 1 && Number(queryData.status) === 1) {',
    'status 字符串转数字比较')
print(f"✅ {r}")
