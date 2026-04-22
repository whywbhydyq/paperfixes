# 第一步：给 useAuthStore 加 inputText 状态
with open('src/store/useAuthStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''  activeJob: ActiveJob | null;
  login: (user: User, token: string) => void;'''
new1 = '''  activeJob: ActiveJob | null;
  inputText: string;
  login: (user: User, token: string) => void;'''

old2 = '''  setActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;'''
new2 = '''  setActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
  saveInputText: (text: string) => void;
  clearInputText: () => void;'''

old3 = '''    activeJob: null,
    login: (user, token) =>'''
new3 = '''    activeJob: null,
    inputText: '',
    login: (user, token) =>'''

old4 = '''    setActiveJob: (job) => set({ activeJob: job }),
    clearActiveJob: () => set({ activeJob: null }),'''
new4 = '''    setActiveJob: (job) => set({ activeJob: job }),
    clearActiveJob: () => set({ activeJob: null }),
    saveInputText: (text) => set({ inputText: text }),
    clearInputText: () => set({ inputText: '' }),'''

old5 = '''      user: state.user,
      token: state.token,
      isLoggedIn: state.isLoggedIn,
      activeJob: state.activeJob,'''
new5 = '''      user: state.user,
      token: state.token,
      isLoggedIn: state.isLoggedIn,
      activeJob: state.activeJob,
      inputText: state.inputText,'''

for old, new in [(old1,new1),(old2,new2),(old3,new3),(old4,new4),(old5,new5)]:
    if old in content:
        content = content.replace(old, new)
        print(f"✓ store 替换成功")
    else:
        print(f"⚠ 未找到: {old[:40]}")

with open('src/store/useAuthStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("store 完成")
