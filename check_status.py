# 检查各文件关键改动是否生效
files_to_check = {
    'src/pages/ReducePage.tsx': [
        ("空块已删除", "phase === 'done' && (\n    \n    )}", False),
    ],
    'src/pages/DashboardPage.tsx': [
        ("用户名优化", "手机用户", True),
    ],
    'src/components/Navbar.tsx': [
        ("Navbar下拉优化", "手机用户", True),
    ],
    'src/pages/AdminPage.tsx': [
        ("phone字段", "phone", True),
    ],
}

print("=== 当前文件状态检查 ===\n")
for filepath, checks in files_to_check.items():
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"📄 {filepath}")
        for desc, keyword, should_exist in checks:
            found = keyword in content
            if found == should_exist:
                status = "✅"
            else:
                status = "❌"
            print(f"  {status} {desc}: {'存在' if found else '不存在'} (期望{'存在' if should_exist else '不存在'})")
        print()
    except FileNotFoundError:
        print(f"  ❌ 文件不存在: {filepath}\n")

# 检查AdminPage手机号显示实际内容
print("=== AdminPage 手机号相关代码片段 ===")
with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    admin = f.read()
# 找到phone相关行
lines = admin.split('\n')
for i, line in enumerate(lines):
    if 'phone' in line.lower() and ('u.phone' in line or 'phone' in line):
        print(f"  行{i+1}: {line.strip()}")
