# ============================================================
# 创建 PaymentModal 组件
# ============================================================
payment_modal = r'''import { useState } from 'react';
import { X, Alipay, Wallet, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  plan: {
    name: string;
    price: number;
    quota: number;
    planKey: string;
  } | null;
  onClose: () => void;
  onConfirm: (payType: 'alipay' | 'wxpay') => Promise<void>;
}

export default function PaymentModal({ plan, onClose, onConfirm }: PaymentModalProps) {
  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay');
  const [loading, setLoading] = useState(false);

  if (!plan) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(payType);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">确认订阅</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 套餐信息 */}
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{plan.name}</span>
              <span className="text-lg font-bold text-gray-900">¥{plan.price}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{plan.quota} 次改写额度</p>
          </div>

          {/* 支付方式选择 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">选择支付方式</p>
            <button
              onClick={() => setPayType('alipay')}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                payType === 'alipay'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                payType === 'alipay' ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <span className="text-sm font-bold text-white">支</span>
              </div>
              <span className={`text-sm font-medium ${payType === 'alipay' ? 'text-blue-700' : 'text-gray-600'}`}>
                支付宝
              </span>
              {payType === 'alipay' && (
                <span className="ml-auto text-xs text-blue-600">✓</span>
              )}
            </button>

            <button
              onClick={() => setPayType('wxpay')}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
                payType === 'wxpay'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                payType === 'wxpay' ? 'bg-green-600' : 'bg-gray-300'
              }`}>
                <span className="text-sm font-bold text-white">微</span>
              </div>
              <span className={`text-sm font-medium ${payType === 'wxpay' ? 'text-green-700' : 'text-gray-600'}`}>
                微信支付
              </span>
              {payType === 'wxpay' && (
                <span className="ml-auto text-xs text-green-600">✓</span>
              )}
            </button>
          </div>

          {/* 确认按钮 */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />跳转支付中...
              </span>
            ) : (
              `确认支付 ¥${plan.price}`
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            支付成功后额度即时到账
          </p>
        </div>
      </div>
    </div>
  );
}
'''

with open('src/components/PaymentModal.tsx', 'w', encoding='utf-8') as f:
    f.write(payment_modal)
print('✅ 创建 PaymentModal.tsx')

# ============================================================
# 修复 PricingPage.tsx - 使用弹窗
# ============================================================
with open('src/pages/PricingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 添加 PaymentModal import
old_import = "import { useAuthStore } from '../store/useAuthStore';"
new_import = """import { useAuthStore } from '../store/useAuthStore';
import PaymentModal from '../components/PaymentModal';"""
if old_import in content:
    content = content.replace(old_import, new_import)
    print('✅ 添加 PaymentModal import')

# 2. 添加 state 和 selectedPlan
old_state = "  const [payLoading, setPayLoading] = useState<string | null>(null);"
new_state = """  const [payLoading, setPayLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; quota: number; planKey: string } | null>(null);"""
if old_state in content:
    content = content.replace(old_state, new_state)
    print('✅ 添加 selectedPlan state')

# 3. 简化 handlePurchase - 只做跳转
old_purchase_start = "  const handlePurchase = async (plan: PlanConfig, payType: 'alipay' | 'wxpay' = 'alipay') => {"
if old_purchase_start in content:
    # 找到整个函数并替换
    import re
    old_func = re.search(
        r"  const handlePurchase = async \(plan: PlanConfig.*?\n  \};",
        content,
        re.DOTALL
    )
    if old_func:
        new_func = """  const handlePurchase = async (payType: 'alipay' | 'wxpay') => {
    if (!selectedPlan) return;
    const { token } = useAuthStoreRef;
    setPayLoading(selectedPlan.planKey + '_' + payType);
    try {
      const res = await fetch(`${API_BASE}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planKey: selectedPlan.planKey, payType }),
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
      setSelectedPlan(null);
    }
  };"""
        content = content[:old_func.start()] + new_func + content[old_func.end():]
        print('✅ 简化 handlePurchase')

# 4. 替换按钮区域 - 回到单个按钮
old_btn_block = """                    {plan.price === 0
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
                  )}"""
new_btn_block = """                    {plan.price === 0
                      ? (isLoggedIn ? '当前可用' : '免费注册')
                      : '立即订阅'}
                  </button>"""
if old_btn_block in content:
    content = content.replace(old_btn_block, new_btn_block)
    print('✅ 恢复单个按钮')
else:
    print('⚠️ 按钮区域未匹配，尝试其他方式...')

# 5. 给按钮添加 onClick 弹窗逻辑 - 找到 onClick 位置
old_onclick = "                    onClick={() => handlePurchase(plan)}"
new_onclick = "                    onClick={() => plan.price > 0 ? setSelectedPlan({ name: plan.name, price: plan.price, quota: plan.quota, planKey: plan.planKey }) : null}"
if old_onclick in content:
    content = content.replace(old_onclick, new_onclick)
    print('✅ 修改按钮 onClick')
else:
    # 搜索所有 onClick 和 handlePurchase 相关的
    import re
    content = re.sub(
        r"onClick=\{\(\) => handlePurchase\(plan[^)]*\)\}",
        "onClick={() => plan.price > 0 ? setSelectedPlan({ name: plan.name, price: plan.price, quota: plan.quota, planKey: plan.planKey }) : null}",
        content
    )
    print('✅ 修改按钮 onClick (regex)')

# 6. 在文件末尾的 </div> ); } 之前添加 PaymentModal
old_end = """        </div>
      </div>
    </div>
  );
}"""
new_end = """        </div>
      </div>

      <PaymentModal
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onConfirm={handlePurchase}
      />
    </div>
  );
}"""
if old_end in content:
    content = content.replace(old_end, new_end, 1)
    print('✅ 添加 PaymentModal 到页面')
else:
    print('⚠️ 页面结尾未匹配')

# 清理多余空行
import re
content = re.sub(r'\n{3,}', '\n\n', content)

with open('src/pages/PricingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n✅ PricingPage 改造完成！')
