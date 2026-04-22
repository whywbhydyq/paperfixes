import { Check, Zap, Crown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const plans = [
  {
    name: '免费体验',
    price: 0,
    quota: 5,
    icon: Zap,
    color: 'gray',
    features: [
      '5次免费改写额度',
      '单次最多500字',
      '标准改写质量',
      '邮箱/微信登录',
    ],
    cta: (isLoggedIn: boolean) => isLoggedIn ? '当前方案' : '免费注册',
    disabled: () => false,
  },
  {
    name: '基础套餐',
    price: 29,
    quota: 50,
    icon: Zap,
    color: 'primary',
    popular: true,
    features: [
      '50次改写额度',
      '单次最多3000字',
      '优先处理队列',
      '邮箱/微信登录',
      '30天有效',
    ],
    cta: () => '立即购买',
    disabled: () => false,
  },
  {
    name: '专业套餐',
    price: 99,
    quota: 300,
    icon: Crown,
    color: 'amber',
    features: [
      '300次改写额度',
      '单次最多5000字',
      '最高优先级处理',
      '邮箱/微信登录',
      '90天有效',
    ],
    cta: () => '立即购买',
    disabled: () => false,
  },
];

export default function PricingPage() {
  const { isLoggedIn, openLoginModal } = useAuthStore();

  const handlePurchase = (_plan: typeof plans[0]) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    alert('支付功能即将上线，敬请期待！');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">简单透明的定价</h1>
          <p className="mt-3 text-gray-500">按需购买，额度永久有效</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
                  plan.popular
                    ? 'border-primary-200 shadow-md shadow-primary-100'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-1 text-xs font-semibold text-white shadow">
                    最受欢迎
                  </div>
                )}

                <div className="mb-6">
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                    plan.color === 'primary'
                      ? 'bg-primary-100 text-primary-600'
                      : plan.color === 'amber'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ¥{plan.price}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{plan.quota} 次改写额度</p>
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
                  onClick={() => handlePurchase(plan)}
                  disabled={plan.disabled()}
                  className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-200 hover:shadow-lg'
                      : plan.price === 0
                      ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  } disabled:opacity-50`}
                >
                  {plan.cta(isLoggedIn)}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          <p>所有套餐均使用相同的先进学术改写引擎，无质量差异</p>
          <p className="mt-1">处理失败自动退还额度 · 原文处理完成后不留存</p>
        </div>
      </div>
    </div>
  );
}
