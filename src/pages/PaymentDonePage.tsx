import { useEffect } from 'react';

export default function PaymentDonePage() {
  useEffect(() => {
    // 尝试自动关闭标签页
    const timer = setTimeout(() => {
      window.close();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">支付处理中</h2>
        <p className="mt-2 text-sm text-gray-500">请返回原页面查看结果</p>
        <p className="mt-4 text-xs text-gray-400">此页面将自动关闭...</p>
        <button
          onClick={() => window.close()}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          关闭此页
        </button>
      </div>
    </div>
  );
}
