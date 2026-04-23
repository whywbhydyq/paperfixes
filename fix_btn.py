with open('src/pages/PricingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换按钮文本和添加微信按钮
old_btn = """                    {plan.price === 0 ? (isLoggedIn ? '当前可用' : '免费注册') : '立即购买'}
                  </button>
                </div>"""

new_btn = """                    {plan.price === 0
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
                      {payLoading?.startsWith(plan.planKey) ? '跳转中...' : '微信付款'}
                    </button>
                  )}
                </div>"""

if old_btn in content:
    content = content.replace(old_btn, new_btn)
    print('✅ 替换购买按钮成功')
else:
    print('⚠️ 未匹配')

with open('src/pages/PricingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
