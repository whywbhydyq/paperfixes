with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '  const { isLoggedIn, user, token, openLoginModal, updateQuota, activeJob, setActiveJob, clearActiveJob } = useAuthStore();'
new1 = '  const { isLoggedIn, user, token, openLoginModal, updateQuota, activeJob, setActiveJob, clearActiveJob, inputText: savedText, saveInputText, clearInputText } = useAuthStore();'

old2 = "  const [text, setText] = useState('');"
new2 = "  const [text, setText] = useState(savedText || '');"

old3 = '  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {\n    setText(e.target.value);\n  };'
new3 = '  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {\n    setText(e.target.value);\n    saveInputText(e.target.value);\n  };'

old4 = "  const handleReset = () => {\n    setText(''); setResult(''); setJobId(''); setPhase('input'); setError('');\n    setOutputLen(0); clearActiveJob();\n  };"
new4 = "  const handleReset = () => {\n    setText(''); setResult(''); setJobId(''); setPhase('input'); setError('');\n    setOutputLen(0); clearActiveJob(); clearInputText();\n  };"

for old, new in [(old1,new1),(old2,new2),(old3,new3),(old4,new4)]:
    if old in content:
        content = content.replace(old, new)
        print(f"✓ 替换成功")
    else:
        print(f"⚠ 未找到: {repr(old[:60])}")

with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("ReducePage 完成")
