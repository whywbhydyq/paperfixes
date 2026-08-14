import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configFindUnique: vi.fn(),
  configUpdate: vi.fn(),
  configUpsert: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
  applyPlanCredit: vi.fn(),
}));

vi.mock('../api/_lib/auth', () => ({
  getUserFromRequest: () => 'admin-1',
}));

vi.mock('../api/_lib/constants', () => ({
  isAdminUser: () => true,
}));

vi.mock('../api/_lib/http-security', () => ({
  rejectCrossOriginMutation: () => false,
}));

vi.mock('../api/_lib/plan-entitlements', () => ({
  expireAllDuePlans: vi.fn(),
}));

vi.mock('../api/_lib/redemption-code', () => ({
  createRedemptionCodes: vi.fn(),
}));

vi.mock('../api/_lib/plan-credit', () => ({
  PLAN_CHANGE_REQUIRES_EXPIRY_CODE: 'PLAN_CHANGE_REQUIRES_EXPIRY',
  applyPlanCredit: mocks.applyPlanCredit,
}));

vi.mock('../api/_lib/prisma', () => ({
  default: {
    config: {
      findUnique: mocks.configFindUnique,
      update: mocks.configUpdate,
      create: vi.fn(),
      upsert: mocks.configUpsert,
    },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

import adminHandler from '../api/admin/index';

const plans = [
  {
    planKey: 'free', name: '免费体验', price: 0, quota: 3,
    minChars: 40, maxChars: 500, features: [], popular: false, active: true, sortOrder: 0,
  },
  {
    planKey: 'basic', name: '基础套餐', price: 29, quota: 50,
    minChars: 40, maxChars: 3000, features: ['30 天有效'], popular: true, active: true, sortOrder: 1,
  },
  {
    planKey: 'retired', name: '停用套餐', price: 9, quota: 9,
    minChars: 40, maxChars: 500, features: ['30 天有效'], popular: false, active: false, sortOrder: 2,
  },
];

function responseRecorder() {
  const state: { status?: number; body?: unknown } = {};
  const response = {
    setHeader: vi.fn(),
    status(code: number) {
      state.status = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
  };
  return { response, state };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.configFindUnique.mockResolvedValue({
    key: 'pricing_plans', value: JSON.stringify(plans),
  });
  mocks.userFindUnique.mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', role: 'admin',
  });
  mocks.transaction.mockImplementation(async (callback) => callback({ tx: 'grant-tx' }));
  mocks.applyPlanCredit.mockResolvedValue({
    id: 'user-1', plan: 'basic', quota: 53,
    planExpiresAt: new Date('2026-09-09T00:00:00.000Z'),
  });
});

describe('POST /api/admin?resource=topup', () => {
  it('grants one authoritative active paid plan through the shared locked settlement', async () => {
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: 'user-1', planKey: 'basic', note: '客服补发' },
    } as never, response as never);

    expect(state.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.applyPlanCredit).toHaveBeenCalledWith(
      { tx: 'grant-tx' },
      expect.objectContaining({
        userId: 'user-1', planKey: 'basic', quota: 50, price: 29,
        note: '客服补发', effectiveAt: expect.any(Date),
      }),
    );
    expect(state.body).toMatchObject({
      plan: { planKey: 'basic', name: '基础套餐', quota: 50, price: 29 },
      user: { id: 'user-1', plan: 'basic', quota: 53 },
    });
  });

  it('never returns sensitive user fields from a plan grant', async () => {
    mocks.applyPlanCredit.mockResolvedValue({
      id: 'user-1', plan: 'basic', quota: 53,
      planExpiresAt: new Date('2026-09-09T00:00:00.000Z'),
      passwordHash: 'secret-hash', wechatOpenId: 'secret-open-id', phone: '13800000000',
    });
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: 'user-1', planKey: 'basic' },
    } as never, response as never);

    expect(state.status).toBe(200);
    expect(JSON.stringify(state.body)).not.toMatch(/passwordHash|wechatOpenId|secret-hash|secret-open-id/);
  });

  it.each(['free', 'retired', 'unknown'])(
    'rejects non-paid, inactive or unknown plan %s before opening a transaction',
    async (planKey) => {
      const { response, state } = responseRecorder();
      await adminHandler({
        method: 'POST', query: { resource: 'topup' }, headers: {},
        body: { userId: 'user-1', planKey },
      } as never, response as never);

      expect(state.status).toBe(400);
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.applyPlanCredit).not.toHaveBeenCalled();
    },
  );

  it('rejects legacy arbitrary amount and price fields', async () => {
    const { response, state } = responseRecorder();
    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: 'user-1', planKey: 'basic', amount: 9999, quota: 9999, price: 0.01 },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ code: 'PLAN_GRANT_FIELDS_FORBIDDEN' });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('rejects an arbitrary quota field even when the plan key is valid', async () => {
    const { response, state } = responseRecorder();
    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: 'user-1', planKey: 'basic', quota: 9999 },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ code: 'PLAN_GRANT_FIELDS_FORBIDDEN' });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns a stable conflict when an active plan cannot be changed', async () => {
    mocks.applyPlanCredit.mockRejectedValue(new Error('PLAN_CHANGE_REQUIRES_EXPIRY'));
    const { response, state } = responseRecorder();
    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: 'user-1', planKey: 'basic' },
    } as never, response as never);

    expect(state.status).toBe(409);
    expect(state.body).toMatchObject({ code: 'PLAN_CHANGE_REQUIRES_EXPIRY' });
  });

  it('trims userId and rejects an empty identifier before opening a transaction', async () => {
    const { response, state } = responseRecorder();
    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: '   ', planKey: 'basic' },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ code: 'PLAN_GRANT_INVALID' });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns a stable 404 when the target user does not exist', async () => {
    mocks.applyPlanCredit.mockRejectedValue(new Error('USER_NOT_FOUND'));
    const { response, state } = responseRecorder();
    await adminHandler({
      method: 'POST', query: { resource: 'topup' }, headers: {},
      body: { userId: '  missing-user  ', planKey: 'basic' },
    } as never, response as never);

    expect(mocks.applyPlanCredit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'missing-user' }),
    );
    expect(state.status).toBe(404);
    expect(state.body).toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});

describe('pricing plan configuration validation', () => {
  it('returns the stable validation code when plans is null', async () => {
    const { response, state } = responseRecorder();
    await adminHandler({
      method: 'PUT', query: { resource: 'config' }, headers: {},
      body: { plans: null },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ code: 'PLAN_CONFIG_INVALID' });
    expect(mocks.configUpsert).not.toHaveBeenCalled();
  });

  it.each([
    ['negative quota', { quota: -1 }],
    ['zero quota', { quota: 0 }],
    ['null quota', { quota: null }],
    ['fractional quota', { quota: 1.5 }],
    ['negative price', { price: -1 }],
    ['null price', { price: null }],
    ['empty plan key', { planKey: '' }],
  ])('rejects %s with a stable 400 before saving', async (_label, invalidFields) => {
    const invalidPlans = structuredClone(plans);
    Object.assign(invalidPlans[1], invalidFields);
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'PUT', query: { resource: 'config' }, headers: {},
      body: { plans: invalidPlans },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ code: 'PLAN_CONFIG_INVALID' });
    expect(mocks.configUpsert).not.toHaveBeenCalled();
  });

  it('rejects duplicate plan keys before saving', async () => {
    const invalidPlans = structuredClone(plans);
    invalidPlans[2].planKey = 'basic';
    const { response, state } = responseRecorder();

    await adminHandler({
      method: 'PUT', query: { resource: 'config' }, headers: {},
      body: { plans: invalidPlans },
    } as never, response as never);

    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ code: 'PLAN_CONFIG_INVALID' });
    expect(mocks.configUpsert).not.toHaveBeenCalled();
  });
});

it('blocks direct quota or plan edits that would bypass expiring plan grants', async () => {
  const { response, state } = responseRecorder();
  await adminHandler({
    method: 'PUT', query: { resource: 'users' }, headers: {},
    url: '/api/admin?resource=users&id=user-1',
    body: { quota: 9999, plan: 'pro', role: 'user' },
  } as never, response as never);

  expect(state.status).toBe(400);
  expect(state.body).toMatchObject({ code: 'DIRECT_ENTITLEMENT_EDIT_DISABLED' });
  expect(mocks.userUpdate).not.toHaveBeenCalled();
});

it('renders a paid-plan selector and no arbitrary quota input in the admin grant modal', () => {
  const adminPage = readFileSync('src/pages/AdminPage.tsx', 'utf8');

  expect(adminPage).toContain('人工发放一次性套餐');
  expect(adminPage).toContain('topupPlanKey');
  expect(adminPage).toContain("plan.active && plan.planKey !== 'free'");
  expect(adminPage).not.toContain('topupAmount');
  expect(adminPage).not.toContain('充值次数');
  expect(adminPage).not.toContain("planKey: 'manual'");
  expect(adminPage).not.toContain('editData.quota');
  expect(adminPage).not.toContain('editData.plan');
});
