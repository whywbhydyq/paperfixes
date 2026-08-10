import { useEffect, useState } from 'react';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { trackEvent } from '../lib/analytics';
import { ONLINE_PAYMENT_MAINTENANCE_MESSAGE } from '../../shared/payment-maintenance';

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

export default function PricingPage() {
  const { isLoggedIn, openLoginModal } = useAuthStore();
  
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackEvent('pricing_visit');
    fetch(`${API_BASE}/api/admin?resource=config`)
      .then(r => r.json())
      .then(d => {
        const plans = d.plans || [];
        setPlans(plans);
        setLoading(false);
        trackEvent('pricing_plans_loaded', { plan_count: plans.length });
      })
      .catch(() => {
        setLoading(false);
        trackEvent('pricing_plans_load_fail');
      });
  }, []);

  const handlePlanClick = (plan: PlanConfig) => {
    trackEvent('pricing_click', {
      plan_key: plan.planKey,
      plan_name: plan.name,
      price: plan.price,
      quota: plan.quota,
      logged_in: isLoggedIn,
    });

    if (plan.price > 0) {
      trackEvent('payment_unavailable_click', { plan_key: plan.planKey, price: plan.price });
      return;
    }

    if (isLoggedIn) {
      trackEvent('free_plan_use_click');
      window.location.href = '/dashboard';
    } else {
      trackEvent('free_plan_register_click');
      openLoginModal();
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
          <p className="mt-3 text-gray-500">所有付费套餐有效期为 30 天</p>
          <p className="mt-2 text-sm text-gray-400">
            单次购买固定增加所选套餐额度，不自动续费。有效期内再次购买将在当前剩余有效期后叠加 30 天；
            到期后未使用额度清零并恢复免费套餐。
          </p>
          <p
            id="payment-maintenance-status"
            role="status"
            className="mx-auto mt-5 max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
          >
            {ONLINE_PAYMENT_MAINTENANCE_MESSAGE}
          </p>
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
                    onClick={() => handlePlanClick(plan)}
                    disabled={plan.price > 0}
                    aria-describedby={plan.price > 0 ? 'payment-maintenance-status' : undefined}
                    title={plan.price > 0 ? ONLINE_PAYMENT_MAINTENANCE_MESSAGE : undefined}
                    className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                      plan.price > 0
                        ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500 shadow-none'
                        : plan.popular
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-200 hover:shadow-lg'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {plan.price === 0
                      ? (isLoggedIn ? '前往使用' : '免费注册')
                      : ONLINE_PAYMENT_MAINTENANCE_MESSAGE}
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

    </div>
  );
}
