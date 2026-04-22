with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '<p className="mt-3 text-center text-xs text-gray-400">\u60a8\u7684\u539f\u6587\u5df2\u5728\u5904\u7406\u5b8c\u6210\u540e\u5f7b\u5e95\u6e05\u9664\uff0c\u4e0d\u4f1a\u5728\u4efb\u4f55\u670d\u52a1\u5668\u4e0a\u7559\u5b58</p>'

if old in content:
    content = content.replace(old, '')
    print("✓ 删除不留存提示成功")
else:
    print("⚠ 该提示已不存在，跳过")

with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("完成")
