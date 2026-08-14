import {
  isOnlinePlanCheckoutDisabled,
  ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
} from '../../shared/payment-maintenance';

export function getPlanDisplayName(plan: string | null | undefined): string {
  if (plan === 'pro') return '专业套餐';
  if (plan === 'basic') return '基础套餐';
  if (!plan || plan === 'free') return '免费套餐';
  return '付费套餐';
}

export function getPricingPlanPresentation(
  planKey: string,
  price: number | null,
  isLoggedIn: boolean,
) {
  const isFreePlan = planKey === 'free';
  return {
    priceLabel: isFreePlan
      ? '免费'
      : typeof price === 'number' && Number.isFinite(price) && price > 0
        ? `¥${price}`
        : '价格待定',
    ctaLabel: isFreePlan
      ? (isLoggedIn ? '前往使用' : '免费注册')
      : ONLINE_PAYMENT_MAINTENANCE_MESSAGE,
    checkoutDisabled: isOnlinePlanCheckoutDisabled(planKey),
  };
}
