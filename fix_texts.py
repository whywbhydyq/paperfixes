import re

# 修复 ReducePage.tsx
with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 去掉底部"原文已清除"提示
old1 = '''{phase === 'done' && (
 <p className="mt-3 text-center text-xs text-gray-400">您的原文已在处理完成后彻底清除，不会在任何服务器上留存</p>
 )}'''
new1 = ''

# 去掉输入框下方"不留存"提示
old2 = '<span>免费用户单次 {MIN_CHARS}-{MAX_CHARS} 字 · 改写完成后原文不留存 · 输出字数严格控制</span>'
new2 = '<span>单次 {MIN_CHARS}-{MAX_CHARS} 字 · 输出字数严格控制</span>'

for old, new in [(old1, new1), (old2, new2)]:
    if old in content:
        content = content.replace(old, new)
        print(f'✓ 替换成功')
    else:
        print(f'⚠ 未找到，跳过: {old[:30]}')

with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 修复 JobPoller.tsx 改文案
with open('src/components/JobPoller.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old3 = "{status === 'PENDING' ? '正在排队中...' : '正在改写中...'}"
new3 = "{status === 'PENDING' ? '正在思考中...' : '正在改写中...'}"

if old3 in content:
    content = content.replace(old3, new3)
    print('✓ 排队文案替换成功')
else:
    print('⚠ 排队文案未找到')

with open('src/components/JobPoller.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('完成')
