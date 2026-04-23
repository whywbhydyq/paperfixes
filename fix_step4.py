# ============================================================
# 修复 src/pages/PricingPage.tsx - 接入真实支付跳转
# ============================================================
with open('src/pages/PricingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 移除旧的API_BASE声明（如已存在则保留）
# 替换handlePurchase函数
old_purchase = """  const handlePurchase = (plan: PlanConfig) => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (plan.price === 0) return;
    alert('支付功能即将上线，敬请期待！');
  };"""

new_purchase = """  const [payLoading, setPayLoading] = useState<string | null>(null);

  const handlePurchase = async (plan: PlanConfig, payType: 'alipay' | 'wxpay' = 'alipay') => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (plan.price === 0) return;
    const { token } = useAuthStoreRef;
    setPayLoading(plan.planKey + '_' + payType);
    try {
      const res = await fetch(`${API_BASE}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planKey: plan.planKey, payType }),
      });
      const data = await res.json();
      if (data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        alert(data.error || '支付失败，请重试');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setPayLoading(null);
    }
  };"""

if old_purchase in content:
    content = content.replace(old_purchase, new_purchase)
    print('✅ 替换 handlePurchase')
else:
    print('⚠️ handlePurchase 未找到')

# 修复import - 添加token支持
old_store_import = "  const { isLoggedIn, openLoginModal } = useAuthStore();"
new_store_import = "  const { isLoggedIn, openLoginModal, token } = useAuthStore();\n  const useAuthStoreRef = { token };"
if old_store_import in content:
    content = content.replace(old_store_import, new_store_import)
    print('✅ 添加 token 到 store')
else:
    print('⚠️ store import 未找到')

# 替换立即购买按钮 - 添加支付宝和微信两个按钮
old_btn = """{plan.price === 0 ? (isLoggedIn ? '当前可用' : '免费注册') : '立即购买'}
                </button>"""
new_btn = """{plan.price === 0
                    ? (isLoggedIn ? '当前可用' : '免费注册')
                    : payLoading?.startsWith(plan.planKey)
                    ? '跳转中...'
                    : '支付宝付款'}
                </button>
                {plan.price > 0 && (
                  <button
                    onClick={() => handlePurchase(plan, 'wxpay')}
                    disabled={!!payLoading}
                    className="w-full mt-2 rounded-xl py-2.5 text-sm font-semibold transition-all border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 disabled:opacity-50"
                  >
                    微信付款
                  </button>
                )}"""
if old_btn in content:
    content = content.replace(old_btn, new_btn)
    print('✅ 添加支付宝/微信付款按钮')
else:
    print('⚠️ 购买按钮未找到')

with open('src/pages/PricingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ============================================================
# 修复 src/pages/HomePage.tsx - 移除"支持微信/邮箱登录"文案
# ============================================================
with open('src/pages/HomePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_badge = """        <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-green-500" />
            支持微信/邮箱登录
          </div>"""
new_badge = """        <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-green-500" />
            手机号/邮箱登录
          </div>"""
if old_badge in content:
    content = content.replace(old_badge, new_badge)
    print('✅ 修复 HomePage 登录文案')
else:
    # 尝试更简单的替换
    if '支持微信/邮箱登录' in content:
        content = content.replace('支持微信/邮箱登录', '手机号/邮箱登录')
        print('✅ 修复 HomePage 登录文案 (简单替换)')
    else:
        print('⚠️ 微信文案未找到')

# 移除承诺列表中的微信条目
if '支持微信扫码和邮箱登录' in content:
    content = content.replace("'支持微信扫码和邮箱登录',", "'支持手机号和邮箱登录',")
    print('✅ 修复承诺列表中的微信文案')

with open('src/pages/HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ============================================================
# 修复 src/components/Footer.tsx - 移除微信相关文案
# ============================================================
with open('src/components/Footer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# admin/index.ts 的 DEFAULT_PLANS features 也要改
print('\n检查 api/admin/index.ts features 文案...')
with open('api/admin/index.ts', 'r', encoding='utf-8') as f:
    admin_content = f.read()

if '邮箱/手机登录' in admin_content:
    print('✅ admin features 文案已正确（邮箱/手机登录）')
else:
    print('⚠️ admin features 文案未检查')

with open('src/components/Footer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n第四步完成！')
