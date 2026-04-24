import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import PaymentModal from '../components/PaymentModal';

interface PlanConfig {
  planKey: string;
  name: string;
  price: number;
  quota: number;
  minChars: number;
  maxChars: number;
  features: string[];
  popular: boolean;
  active: boolean;
  sortOrder: number;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

// 模块级缓存，整个 session 只请求一次
let _cachedPlans: PlanConfig[] | null = null;

export default function PricingPage() {
  const { isLoggedIn, openLoginModal, token } = useAuthStore();
  const useAuthStoreRef = { token };
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_cachedPlans) {
      setPlans(_cachedPlans);
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/admin?resource=config`)
      .then(r => r.json())
      .then(d => {
        const plans = d.plans || [];
        _cachedPlans = plans;
        setPlans(plans);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [payLoading, setPayLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; quota: number; planKey: string } | null>(null);

  const [paySuccess, setPaySuccess] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const handlePurchase = async (payType: 'alipay' | 'wxpay') => {
    if (!selectedPlan) return;
    const { token } = useAuthStoreRef;
    const loadingKey = selectedPlan.planKey + '_' + payType;
    setPayLoading(loadingKey);
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
        setPendingOrderId(data.orderId);
        setSelectedPlan(null);
        setPayLoading(null);
        window.open(data.payUrl, '_blank');
      } else {
        alert(data.error || '支付失败，请重试');
        setPayLoading(null);
      }
    } catch {
      alert('网络错误，请重试');
      setPayLoading(null);
    }
  };

  const checkPayment = async () => {
    if (!pendingOrderId || !useAuthStoreRef.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/payment/create?orderId=${pendingOrderId}`, {
        headers: { 'Authorization': `Bearer ${useAuthStoreRef.token}` },
      });
      const data = await res.json();
      if (data.status === 'PAID') {
        setPaySuccess(true);
        setPendingOrderId(null);
        // 刷新额度
        const { fetchQuota, updateQuota } = await import('../lib/api');
        const quotaData = await fetchQuota(useAuthStoreRef.token);
        updateQuota(quotaData.quota, quotaData.totalUsed);
      } else {
        alert('尚未收到支付确认，请稍后再试。如果已支付，额度会自动到账。');
      }
    } catch {
      alert('网络错误，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">简单透明的定价</h1>
          <p className="mt-3 text-gray-500">按需购买，额度永久有效</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans
            .filter(p => p.active)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan) => {
              const Icon = plan.planKey === 'pro' ? Crown : Zap;
              return (
                <div
                  key={plan.planKey}
                  className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
                    plan.popular ? 'border-primary-200 shadow-md shadow-primary-100' : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-1 text-xs font-semibold text-white shadow">
                      最受欢迎
                    </div>
                  )}
                  <div className="mb-6">
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                      plan.popular ? 'bg-primary-100 text-primary-600'
                      : plan.planKey === 'pro' ? 'bg-amber-100 text-amber-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">
                        {plan.price === 0 ? '免费' : `¥${plan.price}`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{plan.quota} 次改写额度 · 单次最多 {plan.maxChars} 字</p>
                  </div>
                  <div className="mb-8 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <Check size={15} className="shrink-0 text-green-500" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => plan.price > 0 ? setSelectedPlan({ name: plan.name, price: plan.price, quota: plan.quota, planKey: plan.planKey }) : isLoggedIn ? window.location.href = '/dashboard' : openLoginModal()}
                    className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                      plan.popular
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-200 hover:shadow-lg'
                        : plan.price === 0
                        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {plan.price === 0
                      ? (isLoggedIn ? '前往使用' : '免费注册')
                      : '立即订阅'}
                  </button>
                </div>
              );
            })}
        </div>
        <div className="mt-12 text-center text-sm text-gray-400">
          <p>所有套餐均使用相同的先进改写引擎，无质量差异</p>
          <p className="mt-1">处理失败自动退还额度</p>
        </div>
      </div>

      <PaymentModal
        plan={selectedPlan}
        onClose={() => { setSelectedPlan(null); setPaySuccess(false); }}
        onConfirm={handlePurchase}
        pendingOrderId={pendingOrderId}
        paySuccess={paySuccess}
        onCheckPayment={checkPayment}
      />
    </div>
  );
}
