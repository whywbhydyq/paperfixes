with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到并修复空的 done 块
old = "        {phase === 'done' && (\n          \n        )}"
new = ""

if old in content:
    content = content.replace(old, new)
    print("✓ 修复成功")
else:
    # 尝试其他格式
    import re
    pattern = r"\{phase === 'done' && \(\s*\)\}"
    if re.search(pattern, content):
        content = re.sub(pattern, '', content)
        print("✓ 正则修复成功")
    else:
        print("⚠ 未找到，打印216行附近内容")
        lines = content.split('\n')
        for i, line in enumerate(lines[210:220], start=211):
            print(f"{i}: {repr(line)}")

with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
