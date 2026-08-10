import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { amountToCents, finalizePaidOrder } from '../api/_lib/order-settlement';
import { createSettlementClient } from './helpers/settlement-client';

const paidAt = new Date('2026-08-09T00:00:00.000Z');
const pendingFixture = {
  order: {
    id: 'o1',
    userId: 'u1',
    status: 'PENDING',
    amount: 29,
    quota: 50,
    planKey: 'basic',
    providerTradeNo: null,
  },
  user: {
    id: 'u1',
    plan: 'free',
    quota: 3,
    planExpiresAt: null,
  },
};
const validInput = {
  orderId: 'o1',
  providerTradeNo: 'trade-1',
  paidAmount: '29.00',
  paidAt,
};

it('parses money as integer cents and rejects invalid values', () => {
  expect(amountToCents('29.00')).toBe(2900);
  expect(amountToCents(0.1 + 0.2)).toBe(30);
  expect(() => amountToCents('')).toThrow('PAYMENT_AMOUNT_INVALID');
  expect(() => amountToCents('not-money')).toThrow('PAYMENT_AMOUNT_INVALID');
  expect(() => amountToCents(-1)).toThrow('PAYMENT_AMOUNT_INVALID');
});

it('credits once and extends from the current remaining expiry', async () => {
  const client = createSettlementClient({
    order: {
      id: 'o1', userId: 'u1', status: 'PENDING', amount: 29, quota: 50, planKey: 'basic',
    },
    user: {
      id: 'u1', plan: 'pro', quota: 7,
      planExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
    },
  });
  expect(await finalizePaidOrder(validInput, client)).toBe('credited');
  expect(await finalizePaidOrder(validInput, client)).toBe('already_paid');
  expect(client.state.user).toMatchObject({ plan: 'basic', quota: 57 });
  expect(client.state.user.planExpiresAt?.toISOString()).toBe('2026-09-19T00:00:00.000Z');
  expect(client.state.topups).toHaveLength(1);
});

it('rejects an amount mismatch without changing state', async () => {
  const client = createSettlementClient(pendingFixture);
  await expect(finalizePaidOrder({
    orderId: 'o1', providerTradeNo: 'trade-1', paidAmount: '0.01',
  }, client)).rejects.toThrow('PAYMENT_AMOUNT_MISMATCH');
  expect(client.state.order.status).toBe('PENDING');
  expect(client.state.user.quota).toBe(pendingFixture.user.quota);
  expect(client.state.topups).toHaveLength(0);
});

it('rolls back order and quota when topup creation fails', async () => {
  const client = createSettlementClient(pendingFixture, { failTopup: true });
  await expect(finalizePaidOrder(validInput, client)).rejects.toThrow('TOPUP_WRITE_FAILED');
  expect(client.state.order.status).toBe('PENDING');
  expect(client.state.user.quota).toBe(pendingFixture.user.quota);
  expect(client.state.topups).toHaveLength(0);
});

it('two concurrent callbacks credit exactly once', async () => {
  const client = createSettlementClient(pendingFixture);
  const results = await Promise.all([
    finalizePaidOrder(validInput, client),
    finalizePaidOrder(validInput, client),
  ]);
  expect(results.sort()).toEqual(['already_paid', 'credited']);
  expect(client.state.topups).toHaveLength(1);
  expect(client.state.user.quota).toBe(53);
});

it('clears stale expired quota before applying a new purchase', async () => {
  const client = createSettlementClient({
    order: {
      id: 'o1', userId: 'u1', status: 'PENDING', amount: 29, quota: 50, planKey: 'basic',
    },
    user: {
      id: 'u1', plan: 'pro', quota: 19,
      planExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
    },
  });
  await finalizePaidOrder(validInput, client);
  expect(client.state.user.quota).toBe(50);
  expect(client.state.user.planExpiresAt?.toISOString()).toBe('2026-09-08T00:00:00.000Z');
});

it('keeps the atomic settlement service ready for a future verified provider', () => {
  const settlement = readFileSync('api/_lib/order-settlement.ts', 'utf8');
  const planCredit = readFileSync('api/_lib/plan-credit.ts', 'utf8');
  expect(settlement).toContain('client.$transaction');
  expect(settlement).toContain('order.updateMany');
  expect(settlement).toContain('applyPlanCredit(tx');
  expect(planCredit).toContain('topup.create');
  expect(planCredit).toContain('user.update');
});
