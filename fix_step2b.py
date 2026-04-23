# ============================================================
# 修复 src/lib/api.ts - 移除 pollWechatScan 函数
# ============================================================
with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 先看看 pollWechatScan 附近的内容用于调试
marker = "export async function pollWechatScan"
if marker in content:
    idx_start = content.index(marker)
    # 从 idx_start 开始，找到下一个 export 或文件末尾
    # 搜索下一个 "export " 关键字（不在同一位置）
    search_from = idx_start + len(marker)
    next_export = content.find("\nexport ", search_from)
    if next_export == -1:
        # 没有下一个 export，说明是文件末尾的函数
        # 往前找到函数结束的 }
        content = content[:idx_start].rstrip() + '\n'
        print('✅ 移除 pollWechatScan (文件末尾)')
    else:
        # 从 next_export 往前去掉空白
        # 找到 idx_start 到 next_export 之间的内容，替换为空
        # 保留 next_export 前的换行
        content = content[:idx_start] + content[next_export:]
        print('✅ 移除 pollWechatScan')
    # 同时清理之前可能残留的注释
    content = content.replace('// 微信登录已移除\n// 微信登录已移除', '// 微信登录已移除')
else:
    print('⚠️ pollWechatScan 未找到，可能已移除')

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n✅ api.ts 修复完成！')
