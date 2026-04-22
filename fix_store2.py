with open('src/store/useAuthStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 加 inputText 初始值
old3 = '      activeJob: null,\n      login: (user, token) =>'
new3 = '      activeJob: null,\n      inputText: \'\',\n      login: (user, token) =>'

# 加 saveInputText 和 clearInputText 方法
old4 = '      setActiveJob: (job) => set({ activeJob: job }),\n      clearActiveJob: () => set({ activeJob: null }),\n    }),'
new4 = '      setActiveJob: (job) => set({ activeJob: job }),\n      clearActiveJob: () => set({ activeJob: null }),\n      saveInputText: (text) => set({ inputText: text }),\n      clearInputText: () => set({ inputText: \'\' }),\n    }),'

# 加 inputText 到持久化
old5 = '        activeJob: state.activeJob,\n      }),\n    }\n  )\n);'
new5 = '        activeJob: state.activeJob,\n        inputText: state.inputText,\n      }),\n    }\n  )\n);'

for old, new in [(old3, new3), (old4, new4), (old5, new5)]:
    if old in content:
        content = content.replace(old, new)
        print(f"✓ 替换成功")
    else:
        print(f"⚠ 未找到: {repr(old[:50])}")

with open('src/store/useAuthStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("store 完成")
