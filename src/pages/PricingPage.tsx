import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import PaymentModal from '../components/PaymentModal';
import { createPaymentOrder, pollPaymentStatus, fetchQuota } from '../lib/api';

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

let _cachedPlans: PlanConfig[] | null = null;

export default function PricingPage() {
  const { isLoggedIn, openLoginModal, token, updateQuota } = useAuthStore();
  const [searchParams] = useSearchParams();
  
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

  // 处理从码支付返回的页面
  useEffect(() => {
    if (searchParams.get('from_pay') === '1' && token) {
      const order = searchParams.get('order');
      if (order) {
        setPendingOrderId(order);
        console.log('[支付回跳] 开始轮询订单:', order);
      }
      fetchQuota(token).then((data) => updateQuota(data.quota, data.totalUsed)).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // 自动轮询支付状态
  useEffect(() => {
    if (pendingOrderId && !paySuccess && token) {
      // 立即查一次
      checkPayment(true);
      
      // 每 3 秒轮询一次
      pollStartRef.current = Date.now();
      pollTimerRef.current = setInterval(() => {
        // 最多轮询5分钟
        if (Date.now() - pollStartRef.current > 5 * 60 * 1000) {
          if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
          return;
        }
        checkPayment(true);
      }, 3000);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [pendingOrderId, paySuccess, token]);

  const handlePurchase = async (payType: 'alipay' | 'wxpay') => {
    if (!selectedPlan) return;
    const loadingKey = selectedPlan.planKey + '_' + payType;
    setPayLoading(loadingKey);
    try {
      const data = await createPaymentOrder(selectedPlan.planKey, payType, token);
      if (data.submitUrl && data.params && data.orderId) {
        setPendingOrderId(data.orderId);
        setSelectedPlan(null);
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.submitUrl;
        form.target = '_self';
        for (const [k, v] of Object.entries(data.params)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = v;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } else {
        alert(data.error || '支付创建失败，请重试');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '网络错误，请重试');
    } finally {
      setPayLoading(null);
    }
  };

  const checkPayment = async (silent: boolean = false) => {
    if (!pendingOrderId || !token) return;
    try {
      const data = await pollPaymentStatus(pendingOrderId, token);
      if (data.status === 'PAID') {
        // 清除定时器
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        
        setPaySuccess(true);
        setPendingOrderId(null);
        
        // 修复：正确调用 useAuthStore 的 updateQuota 和 api 的 fetchQuota
        const quotaData = await fetchQuota(token);
        updateQuota(quotaData.quota, quotaData.totalUsed);
      } else {
        if (!silent) {
          alert('尚未收到支付确认，请稍后再试。如果已支付，额度会自动到账。');
        }
      }
    } catch {
      if (!silent) {
        alert('网络错误，请重试');
      }
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
        onClose={() => {
          setSelectedPlan(null);
          setPaySuccess(false);
          setPendingOrderId(null);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }}
        onConfirm={handlePurchase}
        pendingOrderId={pendingOrderId}
        paySuccess={paySuccess}
        onCheckPayment={() => checkPayment(false)}
      />
    </div>
  );
}