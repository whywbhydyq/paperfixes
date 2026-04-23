# ============================================================
# 修复 src/components/LoginModal.tsx - 移除微信相关内容
# ============================================================
with open('src/components/LoginModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. 移除 QrCode import
old_imp = "import { X, Mail, Phone, QrCode, Eye, EyeOff, Loader2 } from 'lucide-react';"
new_imp = "import { X, Mail, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';"
if old_imp in content:
    content = content.replace(old_imp, new_imp)
    changes += 1
    print('✅ 移除 QrCode import')
else:
    print('⚠️ QrCode import 未找到')

# 2. 移除 api import 中的微信函数
old_api = """import {
  loginWithEmail, registerWithEmail,
  sendSmsCode, verifySmsCode,
  getWechatQR, pollWechatScan,
} from '../lib/api';"""
new_api = """import {
  loginWithEmail, registerWithEmail,
  sendSmsCode, verifySmsCode,
} from '../lib/api';"""
if old_api in content:
    content = content.replace(old_api, new_api)
    changes += 1
    print('✅ 移除 getWechatQR/pollWechatScan import')
else:
    print('⚠️ api import 未找到，检查当前内容...')
    # 搜索看看当前是什么样子
    for i, line in enumerate(content.split('\n')):
        if 'getWechatQR' in line or 'pollWechatScan' in line:
            print(f'  L{i+1}: {line}')

# 3. 修改 Tab 类型
old_tab = "type Tab = 'phone' | 'email' | 'wechat';"
new_tab = "type Tab = 'phone' | 'email';"
if old_tab in content:
    content = content.replace(old_tab, new_tab)
    changes += 1
    print('✅ 修改 Tab 类型')
else:
    print('⚠️ Tab 类型未找到')

# 4. 移除 qr 相关 state
old_qr_state = """  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState<'loading' | 'waiting' | 'scanned' | 'expired'>('loading');"""
if old_qr_state in content:
    content = content.replace(old_qr_state, '')
    changes += 1
    print('✅ 移除 qr state')
else:
    print('⚠️ qr state 未找到')

# 5. 移除 resetForm 中的 qr 重置
old_reset = "    setQrUrl(''); setQrStatus('loading');"
if old_reset in content:
    content = content.replace(old_reset, '')
    changes += 1
    print('✅ 移除 resetForm 中 qr 重置')
else:
    print('⚠️ resetForm qr 未找到')

# 6. 移除 loadQRCode 函数 - 用行级方式更可靠
lines = content.split('\n')
new_lines = []
skip = False
brace_depth = 0
for line in lines:
    if "const loadQRCode = useCallback(async () => {" in line:
        skip = True
        brace_depth = line.count('{') - line.count('}')
        if brace_depth <= 0:
            skip = False
        continue
    if skip:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            # 检查这行是否包含 }, [login]); 或类似的结束
            if '[login]' in line or '});' in line:
                skip = False
                continue
            else:
                skip = False
                # 不 continue，保留这行
                new_lines.append(line)
        continue
    new_lines.append(line)
if len(new_lines) < len(lines):
    content = '\n'.join(new_lines)
    changes += 1
    print('✅ 移除 loadQRCode 函数')
else:
    print('⚠️ loadQRCode 未找到')

# 7. 修复 useEffect
old_effect = """  useEffect(() => {
    if (showLoginModal) {
      resetForm();
      if (tab === 'wechat') loadQRCode();
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [showLoginModal, tab, resetForm, loadQRCode]);"""
new_effect = """  useEffect(() => {
    if (showLoginModal) {
      resetForm();
    } else {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }
    return () => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [showLoginModal, resetForm]);"""
if old_effect in content:
    content = content.replace(old_effect, new_effect)
    changes += 1
    print('✅ 修复 useEffect')
else:
    print('⚠️ useEffect 未找到，尝试按行修复...')
    # 按行处理
    content = content.replace("if (tab === 'wechat') loadQRCode();\n", '')
    content = content.replace("if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }\n", '')
    content = content.replace(', tab, loadQRCode', '')
    print('✅ useEffect 按行修复')

# 8. 移除微信 Tab 选项
import re
content = re.sub(r"\s*\{\s*key:\s*'wechat',\s*label:\s*'微信',\s*icon:\s*<QrCode[^/]*\/>\s*\},?\n?", '\n', content)
changes += 1
print('✅ 移除微信Tab选项 (regex)')

# 9. 移除微信 Tab JSX 内容块
# 找 {tab === 'wechat' && ( ... )} 块
pattern = r"\s*\{tab\s*===\s*'wechat'\s*&&\s*\([\s\S]*?\)\}"
match = re.search(pattern, content)
if match:
    content = content[:match.start()] + content[match.end():]
    changes += 1
    print('✅ 移除微信Tab JSX块')
else:
    print('⚠️ 微信Tab JSX块未找到')

# 10. 清理可能的 pollRef 残留
content = re.sub(r'\s*const pollRef\s*=.*?\n', '\n', content)
print('✅ 清理 pollRef 残留')

# 11. 清理多余空行（3个以上连续空行变2个）
content = re.sub(r'\n{4,}', '\n\n', content)

with open('src/components/LoginModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n✅ LoginModal.tsx 修复完成！共 {changes} 处修改')
