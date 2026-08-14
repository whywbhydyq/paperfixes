import { describe, expect, it } from 'vitest';
import {
  getPlanDisplayName,
  getPricingPlanPresentation,
} from '../src/lib/plan-display';

describe('plan display names', () => {
  it.each([
    ['free', '免费套餐'],
    ['basic', '基础套餐'],
    ['pro', '专业套餐'],
  ])('labels the built-in %s plan', (plan, expected) => {
    expect(getPlanDisplayName(plan)).toBe(expected);
  });

  it('never labels an unknown non-free plan as free', () => {
    expect(getPlanDisplayName('marketplace-supporter')).toBe('付费套餐');
    expect(getPlanDisplayName('enterprise_custom')).toBe('付费套餐');
  });
});

describe('pricing plan presentation', () => {
  it('uses only the free plan key for free pricing and CTA behavior', () => {
    expect(getPricingPlanPresentation('free', 0, true)).toEqual({
      priceLabel: '免费',
      ctaLabel: '前往使用',
      checkoutDisabled: false,
    });
    expect(getPricingPlanPresentation('free', 0, false).ctaLabel).toBe('免费注册');
  });

  it.each([0, null])(
    'keeps a non-free plan in maintenance when price is %s',
    (price) => {
      const presentation = getPricingPlanPresentation('custom-paid', price, true);
      expect(presentation).toEqual({
        priceLabel: '价格待定',
        ctaLabel: '在线支付维护中，暂不可购买',
        checkoutDisabled: true,
      });
    },
  );
});
