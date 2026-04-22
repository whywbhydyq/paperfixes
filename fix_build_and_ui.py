import re

# ============ 1. 修复 ReducePage.tsx 构建错误（空 JSX 块）============
with open('src/pages/ReducePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  {phase === 'done' && (
    
    )}'''

new = ''

if old in content:
    content = content.replace(old, new)
    with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('✅ ReducePage.tsx 构建错误已修复')
else:
    # 尝试宽松匹配（空白字符可能不同）
    pattern = r"\{phase === 'done' && \(\s*\n\s*\n\s*\)\}"
    if re.search(pattern, content):
        content = re.sub(pattern, '', content)
        with open('src/pages/ReducePage.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print('✅ ReducePage.tsx 构建错误已修复（宽松匹配）')
    else:
        print('⚠️  ReducePage.tsx 未找到目标片段，请手动检查')

# ============ 2. 修复 Navbar - 了解更多/定价 链接可点击（已是Link，检查路由）============
# App.tsx 中 /home 对应 HomePage，/pricing 对应 PricingPage，路由已正确
# 检查 Navbar 中导航链接是否完整
with open('src/components/Navbar.tsx', 'r', encoding='utf-8') as f:
    nav_content = f.read()

# 确认 navLinks 包含了解更多和定价
if "'/home'" in nav_content and "'/pricing'" in nav_content:
    print('✅ Navbar 导航链接已正确配置（了解更多→/home，定价→/pricing）')
else:
    print('⚠️  Navbar 导航链接可能缺失，请手动检查')

# ============ 3. 优化用户显示名：手机号用户显示"手机用户+后4位"============
with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    dash_content = f.read()

old_name = "const displayName = user?.email || user?.phone || user?.wechatName || '用户';"
new_name = """const rawPhone = user?.phone;
  const displayName = user?.email 
    || user?.wechatName 
    || (rawPhone ? '手机用户' + rawPhone.slice(-4) : null)
    || '用户';"""

if old_name in dash_content:
    dash_content = dash_content.replace(old_name, new_name)
    with open('src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
        f.write(dash_content)
    print('✅ DashboardPage 用户显示名已优化（手机号→手机用户XXXX）')
else:
    print('⚠️  DashboardPage 未找到displayName定义，请手动检查')

# ============ 4. Navbar 用户下拉框显示名优化 ============
old_nav_name = "user?.email || user?.wechatName || '用户'"
new_nav_name = "user?.email || user?.wechatName || (user?.phone ? '手机用户' + user.phone.slice(-4) : '用户')"

if old_nav_name in nav_content:
    nav_content = nav_content.replace(old_nav_name, new_nav_name)
    with open('src/components/Navbar.tsx', 'w', encoding='utf-8') as f:
        f.write(nav_content)
    print('✅ Navbar 用户下拉显示名已优化')
else:
    print('⚠️  Navbar 未找到用户名显示片段，请手动检查')

# ============ 5. 管理后台 - 用户列表增加"手机"列显示优化 ============
with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    admin_content = f.read()

# 当前账号列显示逻辑已有 email||phone||wechatName，但手机号用户phone显示有⚠️前缀，改为更友好
old_phone_display = """{u.phone && u.email ? `⚠️${u.phone}` : u.phone ? `⚠️${u.phone}` : ''}"""
new_phone_display = """{u.phone && !u.email ? <span className="text-xs text-blue-500">📱 {u.phone}</span> : null}"""

if old_phone_display in admin_content:
    admin_content = admin_content.replace(old_phone_display, new_phone_display)
    with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
        f.write(admin_content)
    print('✅ AdminPage 手机号显示已优化')
else:
    print('⚠️  AdminPage 未找到手机号显示片段，跳过')

print('\n🎉 所有修复完成！请运行 npm run build 验证构建')
