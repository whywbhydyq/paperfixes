import { describe, expect, it } from 'vitest';
import { getPlanDisplayName } from '../src/lib/plan-display';

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
