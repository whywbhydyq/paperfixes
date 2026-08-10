import { beforeEach, describe, expect, it, vi } from 'vitest';

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock('../api/_lib/prisma', () => ({
  default: {
    $transaction: transaction,
  },
}));

import handler from '../api/auth/sms';

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

describe('SMS endpoint infrastructure failures', () => {
  beforeEach(() => {
    transaction.mockReset();
  });

  it('returns a stable JSON 503 when the database schema is unavailable', async () => {
    const schemaError = Object.assign(new Error('missing requestIp'), { code: 'P2022' });
    transaction.mockRejectedValue(schemaError);
    const { response, state } = responseRecorder();

    await handler({
      method: 'POST',
      body: { action: 'send', phone: '13800138000' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as never, response as never);

    expect(state.status).toBe(503);
    expect(state.body).toEqual({
      success: false,
      error: '验证码服务正在升级，请稍后再试',
    });
  });
});
