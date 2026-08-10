import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserFromRequest: vi.fn(),
  enforcePlanExpiry: vi.fn(),
  redeemPlanCode: vi.fn(),
  createRedemptionCodes: vi.fn(),
  userFindUnique: vi.fn(),
  configFindUnique: vi.fn(),
  redemptionFindMany: vi.fn(),
}));

vi.mock('../api/_lib/auth', () => ({
  getUserFromRequest: mocks.getUserFromRequest,
}));

vi.mock('../api/_lib/plan-entitlements', () => ({
  enforcePlanExpiry: mocks.enforcePlanExpiry,
  expireAllDuePlans: vi.fn(),
  calculateExtendedExpiry: vi.fn(),
}));

vi.mock('../api/_lib/http-security', () => ({
  rejectCrossOriginMutation: vi.fn(() => false),
}));

vi.mock('../api/_lib/redemption-code', () => ({
  redeemPlanCode: mocks.redeemPlanCode,
  createRedemptionCodes: mocks.createRedemptionCodes,
}));

vi.mock('../api/_lib/prisma', () => ({
  default: {
    user: { findUnique: mocks.userFindUnique },
    config: {
      findUnique: mocks.configFindUnique,
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    redemptionCode: { findMany: mocks.redemptionFindMany },
  },
}));

import adminHandler from '../api/admin/index';
import userHandler from '../api/user/index';

function responseRecorder() {
  const state: { status?: number; body?: unknown } = {};
  const response = {
    status(code: number) {
      state.status = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    setHeader: vi.fn(),
  };
  return { response, state };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserFromRequest.mockReturnValue('u1');
  mocks.enforcePlanExpiry.mockResolvedValue({
    id: 'u1', plan: 'free', quota: 3, totalUsed: 0,
    planExpiresAt: null, passwordHash: null,
  });
  mocks.userFindUnique.mockResolvedValue({
    id: 'u1', email: 'admin@example.com', role: 'admin',
  });
  mocks.configFindUnique.mockResolvedValue({
    key: 'pricing_plans',
    value: JSON.stringify([{
      planKey: 'basic', name: '基础套餐', price: 29, quota: 50,
      minChars: 40, maxChars: 3000, features: ['30 天有效'],
      popular: true, active: true, sortOrder: 1,
    }]),
  });
});

describe('POST /api/user?action=redeem', () => {
  it('redeems through the shared service and returns refreshed entitlements', async () => {
    mocks.redeemPlanCode.mockResolvedValue({
      status: 'redeemed',
      redemption: { planKey: 'basic', quota: 50, source: 'marketplace' },
      user: {
        id: 'u1', plan: 'basic', quota: 53,
        planExpiresAt: new Date('2026-09-09T00:00:00.000Z'),
      },
    });
    const { response, state } = responseRecorder();

    await userHandler({
      method: 'POST', query: { action: 'redeem' },
      body: { code: 'PF-ABCDE-FGHJK-LMNPQ-RSTUV' }, headers: {},
    } as never, response as never);

    expect(mocks.redeemPlanCode).toHaveBeenCalledWith({
      userId: 'u1', code: 'PF-ABCDE-FGHJK-LMNPQ-RSTUV',
    });
    expect(state.status).toBe(200);
    expect(state.body).toEqual({
      success: true,
      status: 'redeemed',
      redemption: { planKey: 'basic', quota: 50, source: 'marketplace' },
      entitlements: {
        plan: 'basic', quota: 53,
        planExpiresAt: '2026-09-09T00:00:00.000Z',
      },
    });
  });

  it.each([
    ['REDEMPTION_CODE_INVALID', 400],
    ['REDEMPTION_CODE_USED', 409],
    ['REDEMPTION_CODE_EXPIRED', 410],
  ])('maps %s to a stable client response', async (message, expectedStatus) => {
    mocks.redeemPlanCode.mockRejectedValue(new Error(message));
    const { response, state } = responseRecorder();

    await userHandler({
      method: 'POST', query: { action: 'redeem' },
      body: { code: 'invalid' }, headers: {},
    } as never, response as never);

    expect(state.status).toBe(expectedStatus);
    expect(state.body).toMatchObject({ success: false });
    expect(JSON.stringify(state.body)).not.toContain(message);
  });
});

describe('admin redemption-code resource', () => {
  it('generates a one-time batch from authoritative plan configuration', async () => {
    mocks.createRedemptionCodes.mockResolvedValue({
      batchId: 'batch-1',
      codes: ['PF-ABCDE-FGHJK-LMNPQ-RSTUV', 'PF-23456-789AB-CDEFG-HJKLM'],
    });
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'POST', query: { resource: 'redemption-codes' }, headers: {},
      body: {
        planKey: 'basic', quantity: 2, source: 'marketplace',
        // These must never override the server-side plan definition.
        quota: 999999, price: 0.01,
      },
    } as never, response as never);

    expect(mocks.createRedemptionCodes).toHaveBeenCalledWith({
      planKey: 'basic', quota: 50, price: 29, quantity: 2,
      source: 'marketplace', note: undefined, expiresAt: null,
    });
    expect(state.status).toBe(201);
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(state.body).toMatchObject({
      batchId: 'batch-1', quantity: 2,
      codes: ['PF-ABCDE-FGHJK-LMNPQ-RSTUV', 'PF-23456-789AB-CDEFG-HJKLM'],
      plan: { planKey: 'basic', quota: 50, price: 29 },
    });
  });

  it('lists only non-secret metadata and never exposes stored code hashes', async () => {
    mocks.redemptionFindMany.mockResolvedValue([{
      id: 'voucher-1', codeHint: 'STUV', planKey: 'basic', quota: 50,
      price: 29, source: 'marketplace', batchId: 'batch-1', note: null,
      redeemedById: null, redeemedAt: null, expiresAt: null,
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    }]);
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'GET', query: { resource: 'redemption-codes' }, headers: {},
    } as never, response as never);

    expect(state.status).toBe(200);
    expect(state.body).toMatchObject({ codes: [{ codeHint: 'STUV' }] });
    expect(JSON.stringify(state.body)).not.toContain('codeHash');
  });

  it('maps only explicit input validation failures to HTTP 400', async () => {
    mocks.createRedemptionCodes.mockRejectedValue(new Error('REDEMPTION_QUANTITY_INVALID'));
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'POST', query: { resource: 'redemption-codes' }, headers: {},
      body: { planKey: 'basic', quantity: 101 },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toEqual({ error: '兑换码批次参数无效' });
  });

  it('reports generation conflicts as retryable conflicts rather than bad parameters', async () => {
    mocks.createRedemptionCodes.mockRejectedValue(new Error('REDEMPTION_GENERATION_CONFLICT'));
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'POST', query: { resource: 'redemption-codes' }, headers: {},
      body: { planKey: 'basic', quantity: 2 },
    } as never, response as never);

    expect(state.status).toBe(409);
    expect(state.body).toEqual({
      error: '兑换码生成冲突，请重试',
      retryable: true,
    });
    expect(JSON.stringify(state.body)).not.toContain('参数无效');
  });
});
