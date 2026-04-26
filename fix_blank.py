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

# 改回 _blank，但支付页用 window.open + window.close 方式
# 实际上最简单的方案：保持 _blank，原页面轮询照常工作
safe_replace('src/pages/PricingPage.tsx',
    "        form.target = '_self';",
    "        form.target = '_blank';",
    '改回 _blank 保持原页面轮询')

print("✅ 完成")
