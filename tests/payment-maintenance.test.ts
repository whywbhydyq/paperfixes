import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock('../api/_lib/prisma', () => ({
  default: {
    order: {
      findFirst,
    },
  },
}));

vi.mock('../api/_lib/auth', () => ({
  getUserFromRequest: () => 'user-1',
}));

import createPaymentHandler from '../api/payment/create';
import notifyPaymentHandler from '../api/payment/notify';
import paymentStatusHandler from '../api/payment/status';

const MAINTENANCE_MESSAGE = '在线支付维护中，暂不可购买';

function responseRecorder() {
  const state: { status?: number; body?: unknown; headers: Map<string, unknown> } = {
    headers: new Map(),
  };
  const response = {
    setHeader(name: string, value: unknown) {
      state.headers.set(name, value);
      return response;
    },
    status(code: number) {
      state.status = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    },
    send(body: unknown) {
      state.body = body;
      return response;
    },
  };
  return { response, state };
}

describe('online payment maintenance mode', () => {
  beforeEach(() => {
    findFirst.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('fails closed before creating an order or reading legacy EPAY configuration', async () => {
    const { response, state } = responseRecorder();

    await createPaymentHandler({
      method: 'POST',
      headers: {},
      body: { planKey: 'basic', payType: 'wxpay' },
    } as never, response as never);

    expect(state.status).toBe(503);
    expect(state.body).toEqual({
      code: 'PAYMENT_UNAVAILABLE',
      error: MAINTENANCE_MESSAGE,
    });
    expect(findFirst).not.toHaveBeenCalled();

    const source = readFileSync('api/payment/create.ts', 'utf8');
    expect(source).not.toMatch(/EPAY_(?:PID|KEY|API)/);
    expect(source).not.toContain('prisma.order.create');
  });

  it('retires the legacy callback without attempting settlement', async () => {
    const { response, state } = responseRecorder();

    await notifyPaymentHandler({ method: 'POST', query: {}, body: {} } as never, response as never);

    expect(state.status).toBe(410);
    expect(state.body).toEqual({
      code: 'PAYMENT_PROVIDER_RETIRED',
      error: MAINTENANCE_MESSAGE,
    });

    const source = readFileSync('api/payment/notify.ts', 'utf8');
    expect(source).not.toMatch(/EPAY_(?:PID|KEY|API)/);
    expect(source).not.toContain('finalizePaidOrder');
  });

  it('reports stored order state without querying the retired provider', async () => {
    findFirst.mockResolvedValue({
      id: 'order-old',
      userId: 'user-1',
      status: 'PENDING',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    vi.stubEnv('EPAY_PID', 'legacy-pid');
    vi.stubEnv('EPAY_KEY', 'legacy-key');
    vi.stubEnv('EPAY_API', 'https://legacy.example/');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { response, state } = responseRecorder();

    await paymentStatusHandler({
      method: 'GET',
      headers: {},
      query: { orderId: 'order-old' },
    } as never, response as never);

    expect(state.status).toBe(200);
    expect(state.body).toEqual({
      status: 'PENDING',
      paymentAvailable: false,
      message: MAINTENANCE_MESSAGE,
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    const source = readFileSync('api/payment/status.ts', 'utf8');
    expect(source).not.toMatch(/EPAY_(?:PID|KEY|API)/);
    expect(source).not.toContain('api.php');
    expect(source).not.toContain('finalizePaidOrder');
  });

  it('keeps paid-plan controls disabled and never mounts the legacy channel modal', () => {
    const pricing = readFileSync('src/pages/PricingPage.tsx', 'utf8');

    expect(pricing).toContain('ONLINE_PAYMENT_MAINTENANCE_MESSAGE');
    expect(pricing).toContain('disabled={presentation.checkoutDisabled}');
    expect(pricing).not.toContain("import PaymentModal from '../components/PaymentModal'");
    expect(pricing).not.toContain('<PaymentModal');
    expect(pricing).not.toContain('createPaymentOrder');
    expect(pricing).not.toContain('pollPaymentStatus');
  });

  it('removes retired provider-specific client surfaces instead of leaving a reusable trap', () => {
    const apiClient = readFileSync('src/lib/api.ts', 'utf8');

    expect(existsSync('src/components/PaymentModal.tsx')).toBe(false);
    expect(apiClient).not.toContain('createPaymentOrder');
    expect(apiClient).not.toContain('pollPaymentStatus');
    expect(apiClient).not.toMatch(/'alipay'\s*\|\s*'wxpay'/);
  });

  it('makes the retired return page truthful while online checkout is unavailable', () => {
    const donePage = readFileSync('src/pages/PaymentDonePage.tsx', 'utf8');

    expect(donePage).toContain('ONLINE_PAYMENT_MAINTENANCE_MESSAGE');
    expect(donePage).not.toContain('支付处理中');
    expect(donePage).not.toContain('window.close()');
    expect(donePage).not.toContain('自动关闭');
  });
});
