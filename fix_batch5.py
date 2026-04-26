import os, re

root = os.path.dirname(os.path.abspath(__file__))
os.chdir(root)

# ============================================================
# Fix 1: LoginModal.tsx - Split loading + fix all validations
# ============================================================
fpath = os.path.join('src', 'components', 'LoginModal.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

replacements = [
    # 1. Split loading state declaration
    (
        'const [loading, setLoading] = useState(false);',
        'const [sendLoading, setSendLoading] = useState(false);\n  const [loginLoading, setLoginLoading] = useState(false);'
    ),
    # 2. handleSendCode: setLoading(true) -> setSendLoading(true)
    (
        "    if (!/^1[3-9]\\d{9}$/.test(phone)) { setError('\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u624b\u673a\u53f7'); return; }\n    setLoading(true);\n    try {\n      const data = await sendSmsCode(phone);",
        "    if (!/^1[3-9]\\d{9}$/.test(phone)) { setError('\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u624b\u673a\u53f7'); return; }\n    setSendLoading(true);\n    try {\n      const data = await sendSmsCode(phone);"
    ),
    # 3. handleSendCode finally: setLoading(false) -> setSendLoading(false)
    (
        '} finally { setLoading(false); }\n  };\n\n  const handleSmsLogin',
        '} finally { setSendLoading(false); }\n  };\n\n  const handleSmsLogin'
    ),
    # 4. Send button: validate phone format + use sendLoading
    (
        'disabled={countdown > 0 || !phone || loading}',
        "disabled={countdown > 0 || !/^1[3-9]\\d{9}$/.test(phone) || sendLoading}"
    ),
    # 5. handleSmsLogin: add phone validation + setLoginLoading
    (
        "  const handleSmsLogin = async () => {\n    setError('');\n    if (!code) { setError('\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801'); return; }\n    setLoading(true);",
        "  const handleSmsLogin = async () => {\n    setError('');\n    if (!/^1[3-9]\\d{9}$/.test(phone)) { setError('\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u624b\u673a\u53f7'); return; }\n    if (!code) { setError('\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801'); return; }\n    setLoginLoading(true);"
    ),
    # 6. handleSmsLogin finally
    (
        '} finally { setLoading(false); }\n  };\n\n  const handlePwdLogin',
        '} finally { setLoginLoading(false); }\n  };\n\n  const handlePwdLogin'
    ),
    # 7. SMS login button: validate phone + code length + loginLoading
    (
        'disabled={loading || !phone || !code}',
        "disabled={loginLoading || !/^1[3-9]\\d{9}$/.test(phone) || code.length !== 6}"
    ),
    # 8. SMS login button text: loading -> loginLoading
    (
        "{loading ? <span className=\"flex items-center justify-center gap-2\"><Loader2 size={16} className=\"animate-spin\" />\u767b\u5f55\u4e2d...</span> : '\u767b\u5f55 / \u6ce8\u518c'}",
        "{loginLoading ? <span className=\"flex items-center justify-center gap-2\"><Loader2 size={16} className=\"animate-spin\" />\u767b\u5f55\u4e2d...</span> : '\u767b\u5f55 / \u6ce8\u518c'}"
    ),
    # 9. handlePwdLogin: add phone validation + setLoginLoading
    (
        "  const handlePwdLogin = async () => {\n    setError('');\n    if (!password) { setError('\u8bf7\u8f93\u5165\u5bc6\u7801'); return; }\n    setLoading(true);",
        "  const handlePwdLogin = async () => {\n    setError('');\n    if (!/^1[3-9]\\d{9}$/.test(phone)) { setError('\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u624b\u673a\u53f7'); return; }\n    if (!password) { setError('\u8bf7\u8f93\u5165\u5bc6\u7801'); return; }\n    setLoginLoading(true);"
    ),
    # 10. handlePwdLogin finally
    (
        '} finally { setLoading(false); }\n  };\n\n  const handleSetPwd',
        '} finally { setLoginLoading(false); }\n  };\n\n  const handleSetPwd'
    ),
    # 11. Password login button: validate phone + loginLoading
    (
        'disabled={loading || !phone || !password}',
        "disabled={loginLoading || !/^1[3-9]\\d{9}$/.test(phone) || !password}"
    ),
    # 12. Password login button text: loading -> loginLoading
    (
        "{loading ? <span className=\"flex items-center justify-center gap-2\"><Loader2 size={16} className=\"animate-spin\" />\u767b\u5f55\u4e2d...</span> : '\u767b\u5f55'}",
        "{loginLoading ? <span className=\"flex items-center justify-center gap-2\"><Loader2 size={16} className=\"animate-spin\" />\u767b\u5f55\u4e2d...</span> : '\u767b\u5f55'}"
    ),
    # 13. handleSetPwd: setLoading(true) -> setLoginLoading(true)
    (
        "    if (newPwd !== confirmPwd) { setError('\u4e24\u6b21\u5bc6\u7801\u4e0d\u4e00\u81f4'); return; }\n    setLoading(true);\n    try {\n      await setUserPassword(newPwd, tempToken);",
        "    if (newPwd !== confirmPwd) { setError('\u4e24\u6b21\u5bc6\u7801\u4e0d\u4e00\u81f4'); return; }\n    setLoginLoading(true);\n    try {\n      await setUserPassword(newPwd, tempToken);"
    ),
    # 14. handleSetPwd finally (unique: followed by needSetPwd)
    (
        '} finally { setLoading(false); }\n  };\n\n  if (needSetPwd) {',
        '} finally { setLoginLoading(false); }\n  };\n\n  if (needSetPwd) {'
    ),
    # 15. SetPwd button disabled: loading -> loginLoading
    (
        'disabled={loading || !newPwd || !confirmPwd}',
        'disabled={loginLoading || !newPwd || !confirmPwd}'
    ),
    # 16. SetPwd button text: loading -> loginLoading
    (
        "{loading ? <span className=\"flex items-center justify-center gap-2\"><Loader2 size={16} className=\"animate-spin\" />\u8bbe\u7f6e\u4e2d...</span> : '\u786e\u8ba4\u8bbe\u7f6e'}",
        "{loginLoading ? <span className=\"flex items-center justify-center gap-2\"><Loader2 size={16} className=\"animate-spin\" />\u8bbe\u7f6e\u4e2d...</span> : '\u786e\u8ba4\u8bbe\u7f6e'}"
    ),
]

ok_count = 0
for i, (old, new) in enumerate(replacements, 1):
    if old in c:
        c = c.replace(old, new, 1)
        ok_count += 1
    else:
        print(f'[WARNING] LoginModal #{i}: not found: {old[:60]}...')

# Verify no stale setLoading references
total = c.count('setLoading(')
send = c.count('setSendLoading(')
login = c.count('setLoginLoading(')
stale = total - send - login

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(c)

if stale > 0:
    print(f'[ERROR] LoginModal: {stale} stale setLoading() references remain!')
else:
    print(f'[OK] LoginModal.tsx: {ok_count}/{len(replacements)} applied, 0 stale references')

# ============================================================
# Fix 2: sms.ts - catch block: throw err -> proper 500 response
# Also change err: any -> err: unknown for strict TS
# ============================================================
fpath = os.path.join('api', 'auth', 'sms.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_catch = """    } catch (err: any) {
      if (err.message === 'RATE_LIMIT_60S') {
        return res.status(429).json({ success: false, message: '\u53d1\u9001\u592a\u9891\u7e41\uff0c\u8bf760\u79d2\u540e\u518d\u8bd5' });
      }
      if (err.message === 'RATE_LIMIT_DAILY') {
        return res.status(429).json({ success: false, message: '\u8be5\u624b\u673a\u53f7\u4eca\u65e5\u53d1\u9001\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650\uff0c\u8bf7\u660e\u5929\u518d\u8bd5' });
      }
      throw err;
    }"""

new_catch = """    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'RATE_LIMIT_60S') {
        return res.status(429).json({ success: false, message: '\u53d1\u9001\u592a\u9891\u7e41\uff0c\u8bf760\u79d2\u540e\u518d\u8bd5' });
      }
      if (msg === 'RATE_LIMIT_DAILY') {
        return res.status(429).json({ success: false, message: '\u8be5\u624b\u673a\u53f7\u4eca\u65e5\u53d1\u9001\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650\uff0c\u8bf7\u660e\u5929\u518d\u8bd5' });
      }
      console.error('[SMS] \u4e8b\u52a1\u9519\u8bef:', err);
      return res.status(500).json({ success: false, message: '\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' });
    }"""

if old_catch in c:
    c = c.replace(old_catch, new_catch, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] sms.ts: catch block fixed (no unhandled throw, err: any -> unknown)')
else:
    print('[WARNING] sms.ts: catch block not found')

# ============================================================
# Fix 3: useAuthStore.ts - add checkPlanExpiry to interface
# ============================================================
fpath = os.path.join('src', 'store', 'useAuthStore.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_iface = "  saveInputText: (text: string) => void;\n  clearInputText: () => void;\n}"
new_iface = "  saveInputText: (text: string) => void;\n  clearInputText: () => void;\n  checkPlanExpiry: () => void;\n}"

if old_iface in c:
    c = c.replace(old_iface, new_iface, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] useAuthStore.ts: checkPlanExpiry added to AuthState interface')
else:
    print('[WARNING] useAuthStore.ts: interface anchor not found')

# ============================================================
# Fix 4: DashboardPage.tsx - password disabled: require oldPassword only when user has one
# ============================================================
fpath = os.path.join('src', 'pages', 'DashboardPage.tsx')
with open(fpath, 'r', encoding='utf-8') as f:
    c = f.read()

old_pwd = 'disabled={pwdLoading || !newPassword || !confirmPassword}'
new_pwd = 'disabled={pwdLoading || !newPassword || !confirmPassword || (!!user?.passwordHash && !oldPassword)}'

if old_pwd in c:
    c = c.replace(old_pwd, new_pwd, 1)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(c)
    print('[OK] DashboardPage.tsx: password disabled = require oldPassword only when user has passwordHash')
else:
    print('[WARNING] DashboardPage.tsx: password disabled not found')

print('\n=== Batch 5 done ===')
