import { useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  plan: {
    name: string;
    price: number;
    quota: number;
    planKey: string;
  } | null;
  onClose: () => void;
  onConfirm: (payType: 'alipay' | 'wxpay') => Promise<void>;
  pendingOrderId?: string | null;
  paySuccess?: boolean;
  onCheckPayment?: () => void;
}

export default function PaymentModal({ plan, onClose, onConfirm, pendingOrderId, paySuccess, onCheckPayment }: PaymentModalProps) {
  const [payType, setPayType] = useState<'alipay' | 'wxpay'>('alipay');
  const [loading, setLoading] = useState(false);

  if (!plan && !pendingOrderId && !paySuccess) return null;

  if (paySuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">支付成功</h3>
            <p className="mt-2 text-sm text-gray-500">额度已到账，可以开始改写了</p>
            <button onClick={onClose}
              className="mt-6 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
              开始使用
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingOrderId && !plan) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">等待支付</h3>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Loader2 size={24} className="text-amber-600 animate-spin" />
            </div>
            <p className="text-sm text-gray-600">支付页面已在新标签页打开</p>
            <p className="mt-1.5 text-xs text-primary-600 font-medium">系统正在自动检测支付状态，无需刷新...</p>
            <button onClick={onCheckPayment}
              className="mt-5 w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
              我已完成支付
            </button>
            <button onClick={onClose}
              className="mt-2 w-full rounded-xl border border-gray-200 py-3 text-sm text-gray-500 hover:bg-gray-50">
              稍后再查
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">确认订阅</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{plan.name}</span>
              <span className="text-lg font-bold text-gray-900">¥{plan.price}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{plan.quota} 次改写额度</p>
          </div>

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
