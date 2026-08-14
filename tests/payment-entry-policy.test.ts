import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ONLINE_PAYMENT_AVAILABLE,
  isOnlinePlanCheckoutDisabled,
} from '../shared/payment-maintenance';

const read = (path: string) => readFileSync(path, 'utf8');

describe('online payment entry policy', () => {
  it('closes every non-free plan by plan key even if its configured price is zero', () => {
    expect(ONLINE_PAYMENT_AVAILABLE).toBe(false);
    expect(isOnlinePlanCheckoutDisabled('free')).toBe(false);
    expect(isOnlinePlanCheckoutDisabled('basic')).toBe(true);
    expect(isOnlinePlanCheckoutDisabled('pro')).toBe(true);
    expect(isOnlinePlanCheckoutDisabled('custom-zero-price-plan')).toBe(true);

    const pricing = read('src/pages/PricingPage.tsx');
    expect(pricing).toContain('isOnlinePlanCheckoutDisabled(plan.planKey)');
    expect(pricing).not.toContain('disabled={plan.price > 0}');
    expect(pricing).not.toContain('if (plan.price > 0)');
  });

  it('removes misleading purchase or upgrade calls to action while checkout is closed', () => {
    const dashboard = read('src/pages/DashboardPage.tsx');
    const reduce = read('src/pages/ReducePage.tsx');
    const submit = read('api/rewrite/submit.ts');
    const seo = read('src/components/SEO.tsx');

    expect(dashboard).not.toMatch(/购买额度|去购买额度/);
    expect(reduce).not.toMatch(/升级套餐|购买更多改写额度/);
    expect(submit).not.toMatch(/升级套餐|前往定价页面购买/);
    expect(seo).not.toContain('按需购买改写额度');
    expect(reduce).toContain('当前在线支付维护中');
    expect(dashboard).toContain('套餐说明与兑换码');
  });
});
