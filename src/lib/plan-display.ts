export function getPlanDisplayName(plan: string | null | undefined): string {
  if (plan === 'pro') return '专业套餐';
  if (plan === 'basic') return '基础套餐';
  if (!plan || plan === 'free') return '免费套餐';
  return '付费套餐';
}
