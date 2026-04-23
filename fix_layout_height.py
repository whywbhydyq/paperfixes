with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复左侧输入框：非编辑状态时改为自动高度（不限制 min-h）
old1 = '        <div className="custom-scrollbar flex-1 min-h-[320px] overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-600">{text}</div>'
new1 = '        <div className="custom-scrollbar rounded-xl border border-gray-100 bg-gray-50 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-600">{text}</div>'

if old1 in content:
    content = content.replace(old1, new1)
    print('OK Fix1a: 左侧非编辑状态改为自动高度')
else:
    print('WARN Fix1a: 未找到左侧非编辑 div')

# 修复右侧结果区：done状态固定高度+滚动（保持原样但确保 max-h 生效）
old2 = '          <div className="custom-scrollbar min-h-[320px] max-h-[500px] overflow-y-auto rounded-xl border border-gray-100 bg-green-50/30 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800">{result}</div>'
new2 = '          <div className="custom-scrollbar h-[500px] overflow-y-auto rounded-xl border border-gray-100 bg-green-50/30 p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800">{result}</div>'

if old2 in content:
    content = content.replace(old2, new2)
    print('OK Fix1b: 右侧结果改为固定高度滚动')
else:
    print('WARN Fix1b: 未找到右侧 done 结果 div')

# 修复左侧 textarea：也去掉 min-h 让它随内容扩展（用 rows 控制最小行数）
old3 = '          className={`custom-scrollbar flex-1 min-h-[320px] w-full resize-none rounded-xl border bg-gray-50/50 p-4 text-[15px] leading-relaxed text-gray-800 outline-none transition-colors focus:bg-white focus:ring-2 placeholder:text-gray-400 ${isOverLimit ? \'border-red-300 focus:border-red-400 focus:ring-red-100\' : \'border-gray-200 focus:border-primary-400 focus:ring-primary-100\'}`}'
new3 = '          className={`custom-scrollbar w-full min-h-[320px] resize-none rounded-xl border bg-gray-50/50 p-4 text-[15px] leading-relaxed text-gray-800 outline-none transition-colors focus:bg-white focus:ring-2 placeholder:text-gray-400 ${isOverLimit ? \'border-red-300 focus:border-red-400 focus:ring-red-100\' : \'border-gray-200 focus:border-primary-400 focus:ring-primary-100\'}`}'

if old3 in content:
    content = content.replace(old3, new3)
    print('OK Fix1c: textarea 样式调整')
else:
    print('WARN Fix1c: 未找到 textarea className')

# 右侧 input 等待状态也固定高度
old4 = '        <div className="min-h-[320px]">\n          <JobPoller jobId={jobId} onComplete={handleComplete} onError={handleError} />\n        </div>'
new4 = '        <div className="h-[500px]">\n          <JobPoller jobId={jobId} onComplete={handleComplete} onError={handleError} />\n        </div>'

if old4 in content:
    content = content.replace(old4, new4)
    print('OK Fix1d: 右侧 processing 状态固定高度')
else:
    print('WARN Fix1d: 未找到 processing div')

# 右侧 input 空状态也固定高度
old5 = '          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">'
new5 = '          <div className="flex h-[500px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">'

if old5 in content:
    content = content.replace(old5, new5)
    print('OK Fix1e: 右侧空状态固定高度')
else:
    print('WARN Fix1e: 未找到右侧空状态 div')

with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n=== Fix1 完成 ===')
