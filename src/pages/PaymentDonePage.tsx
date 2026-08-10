import { ONLINE_PAYMENT_MAINTENANCE_MESSAGE } from '../../shared/payment-maintenance';

export default function PaymentDonePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-6 max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.4 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.4a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">在线支付暂不可用</h1>
        <p className="mt-2 text-sm text-gray-600">{ONLINE_PAYMENT_MAINTENANCE_MESSAGE}</p>
        <p className="mt-3 text-xs leading-5 text-gray-500">
          此页面不代表付款成功，也不会自动增加额度。已经获得一次性套餐兑换码的用户可前往个人中心兑换。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="/pricing"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            返回定价页
          </a>
          <a
            href="/dashboard?tab=redeem"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            兑换套餐码
          </a>
        </div>
      </div>
    </div>
  );
}
