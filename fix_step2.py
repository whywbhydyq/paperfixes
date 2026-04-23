# ============================================================
# 修复 src/lib/api.ts - 移除微信相关导出函数
# ============================================================
with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 移除 getWechatQR 函数
old_qr = """export async function getWechatQR() {
  return request<{ qrUrl: string; scene: string }>('/api/auth/wechat/qrcode');
}"""
if old_qr in content:
    content = content.replace(old_qr, '// 微信登录已移除')
    print('✅ 移除 getWechatQR')
else:
    print('⚠️ getWechatQR 未找到')

# 移除 pollWechatScan 函数
old_poll_start = "export async function pollWechatScan(scene: string) {"
old_poll_end = "}\nexport interface SubmitResponse"
if old_poll_start in content:
    idx_start = content.index(old_poll_start)
    idx_end = content.index("}\nexport interface SubmitResponse", idx_start)
    content = content[:idx_start] + '// 微信登录已移除\n' + content[idx_end+1:]
    print('✅ 移除 pollWechatScan')
else:
    print('⚠️ pollWechatScan 未找到')

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# ============================================================
# 修复 src/components/LoginModal.tsx - 移除微信Tab
# ============================================================
with open('src/components/LoginModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 修改import - 移除QrCode, getWechatQR, pollWechatScan
old_import = """import { X, Mail, Phone, QrCode, Eye, EyeOff, Loader2 } from 'lucide-react';"""
new_import = """import { X, Mail, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';"""
if old_import in content:
    content = content.replace(old_import, new_import)
    print('✅ 移除 QrCode import')
else:
    print('⚠️ QrCode import 未找到')

old_api_import = """import {
  loginWithEmail, registerWithEmail,
  sendSmsCode, verifySmsCode,
  getWechatQR, pollWechatScan,
} from '../lib/api';"""
new_api_import = """import {
  loginWithEmail, registerWithEmail,
  sendSmsCode, verifySmsCode,
} from '../lib/api';"""
if old_api_import in content:
    content = content.replace(old_api_import, new_api_import)
    print('✅ 移除 getWechatQR/pollWechatScan import')
else:
    print('⚠️ api import 未找到')

# 2. 修改Tab类型 - 移除wechat
old_tab_type = "type Tab = 'phone' | 'email' | 'wechat';"
new_tab_type = "type Tab = 'phone' | 'email';"
if old_tab_type in content:
    content = content.replace(old_tab_type, new_tab_type)
    print('✅ 修改 Tab 类型')
else:
    print('⚠️ Tab 类型未找到')

# 3. 移除qr相关state
old_qr_state = """  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState<'loading' | 'waiting' | 'scanned' | 'expired'>('loading');"""
new_qr_state = ""
if old_qr_state in content:
    content = content.replace(old_qr_state, '')
    print('✅ 移除 qr state')
else:
    print('⚠️ qr state 未找到')

# 4. 移除resetForm中的qr重置
old_reset_qr = """  setQrUrl(''); setQrStatus('loading');"""
if old_reset_qr in content:
    content = content.replace(old_reset_qr, '')
    print('✅ 移除 resetForm 中 qr 重置')
else:
    print('⚠️ resetForm qr 未找到')

# 5. 移除 loadQRCode 整个函数 (从 const loadQRCode 到 }, [login]);)
old_load_qr_marker = "  const loadQRCode = useCallback(async () => {"
if old_load_qr_marker in content:
    idx_start = content.index(old_load_qr_marker)
    # 找到 }, [login]); 后面
    marker_end = "  }, [login]);"
    idx_end = content.index(marker_end, idx_start)
    content = content[:idx_start] + content[idx_end + len(marker_end):]
    print('✅ 移除 loadQRCode 函数')
else:
    print('⚠️ loadQRCode 未找到')

# 6. 修复 useEffect - 移除 wechat 相关逻辑
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
    print('✅ 修复 useEffect')
else:
    print('⚠️ useEffect 未找到，尝试简化替换')

# 7. 移除Tabs中的微信选项
old_wechat_tab = """     { key: 'wechat', label: '微信', icon: <QrCode size={15} /> },"""
if old_wechat_tab in content:
    content = content.replace(old_wechat_tab, '')
    print('✅ 移除微信Tab选项')
else:
    # 尝试不同空格
    old_wechat_tab2 = "     { key: 'wechat', label: '微信', icon: <QrCode size={15} /> },"
    if old_wechat_tab2 in content:
        content = content.replace(old_wechat_tab2, '')
        print('✅ 移除微信Tab选项 (variant2)')
    else:
        print('⚠️ 微信Tab选项未找到')

# 8. 移除整个微信Tab的JSX内容块
wechat_marker = "         {/* 微信 Tab */}"
if wechat_marker in content:
    idx_start = content.index(wechat_marker)
    # 找到这个block的结束: 在 </div> </div> </div> );} 之前
    # 微信block以 )} 结束，对应tab===wechat的条件渲染
    # 找 {tab === 'wechat' && ( 然后找对应的 )}
    wechat_block_start = "         {tab === 'wechat' && ("
    if wechat_block_start in content:
        idx_b = content.index(wechat_block_start)
        # 找到这个conditional block的结束 "         )}"
        # 向后搜索 "         )}\n         </div>"
        search_from = idx_b
        # 找 ending pattern
        end_marker = "         )}\n         </div>\n         </div>\n         </div>\n       );\n}"
        # 简化: 找3个连续 )}\n 之后的 </div>
        # 用计数括号法
        depth = 0
        i = idx_b
        in_jsx = False
        # 找到 ( 开始
        while i < len(content):
            if content[i] == '(' and not in_jsx:
                depth = 1
                in_jsx = True
                i += 1
                break
            i += 1
        while i < len(content) and in_jsx:
            if content[i] == '(':
                depth += 1
            elif content[i] == ')':
                depth -= 1
                if depth == 0:
                    # 这是匹配的)，后面跟}
                    end_pos = i + 1
                    # 跳过可能的空白和}
                    if end_pos < len(content) and content[end_pos] == '}':
                        end_pos += 1
                    content = content[:idx_start] + content[end_pos:]
                    print('✅ 移除微信Tab JSX内容')
                    break
            i += 1
    else:
        print('⚠️ 微信Tab JSX block未找到')
else:
    print('⚠️ 微信Tab注释未找到')

with open('src/components/LoginModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n第二步完成！')
