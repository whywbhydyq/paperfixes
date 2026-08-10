import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('exposes a same-origin redemption client without adding a Vercel function', () => {
  const apiClient = readFileSync('src/lib/api.ts', 'utf8');
  expect(apiClient).toContain('export async function redeemPlanCodeRequest');
  expect(apiClient).toContain("'/api/user?action=redeem'");
  expect(apiClient).toContain("method: 'POST'");
});

it('offers a minimal logged-in redemption entry and refreshes displayed entitlements', () => {
  const dashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8');
  expect(dashboard).toContain("type ActiveTab = 'history' | 'topups' | 'redeem' | 'password'");
  expect(dashboard).toContain('套餐兑换码');
  expect(dashboard).toContain('redeemPlanCodeRequest(redeemCode)');
  expect(dashboard).toContain('updateUserEntitlements');
  expect(dashboard).toContain('getPlanDisplayName(user?.plan)');
  expect(dashboard).toContain('当前未接通线上支付渠道');
  expect(dashboard).not.toContain('输入购买后收到的一次性兑换码');
});
