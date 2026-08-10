import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSmsRow {
  id: string;
  phone: string;
  code: string;
  used: boolean;
  attempts: number;
  requestIp: string | null;
  expiresAt: Date;
  createdAt: Date;
}

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  userUpsert: vi.fn(),
  sendSms: vi.fn(),
  enforcePlanExpiry: vi.fn(),
}));

vi.mock('../api/_lib/prisma', () => ({
  default: {
    $transaction: mocks.transaction,
    smsCode: {
      count: mocks.count,
      create: mocks.create,
      updateMany: mocks.updateMany,
      findFirst: mocks.findFirst,
    },
    user: {
      upsert: mocks.userUpsert,
    },
  },
}));

vi.mock('../api/_lib/sms', () => ({ sendSms: mocks.sendSms }));
vi.mock('../api/_lib/plan-entitlements', () => ({
  enforcePlanExpiry: mocks.enforcePlanExpiry,
}));

import handler from '../api/auth/sms';
import { hashSmsCode } from '../api/_lib/sms-code';

const currentUser = {
  id: 'user-1',
  email: null,
  phone: '13800138000',
  passwordHash: null,
  wechatOpenId: null,
  wechatName: null,
  wechatAvatar: null,
  role: 'user',
  plan: 'free',
  quota: 3,
  totalUsed: 0,
  planExpiresAt: null,
  createdAt: new Date('2026-08-10T00:00:00.000Z'),
};

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

function request(action: 'send' | 'verify', code?: string) {
  return {
    method: 'POST',
    body: { action, phone: '13800138000', ...(code ? { code } : {}) },
    headers: { 'x-forwarded-for': '203.0.113.9' },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

describe('SMS transaction boundaries', () => {
  let rows: FakeSmsRow[];
  let advisoryLockTails: Map<string, Promise<void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SMS_CODE_SECRET', 'sms-concurrency-test-secret');
    rows = [];
    advisoryLockTails = new Map();

    const count = async ({ where }: { where: Record<string, unknown> }) => {
      return rows.filter((row) => {
        if (where.phone && row.phone !== where.phone) return false;
        if (where.requestIp && row.requestIp !== where.requestIp) return false;
        if (typeof where.used === 'boolean' && row.used !== where.used) return false;
        if (typeof where.attempts === 'number' && row.attempts !== where.attempts) return false;
        const createdAt = where.createdAt as { gt?: Date } | undefined;
        if (createdAt?.gt && row.createdAt <= createdAt.gt) return false;
        const expiresAt = where.expiresAt as { gt?: Date } | undefined;
        if (expiresAt?.gt && row.expiresAt <= expiresAt.gt) return false;
        return true;
      }).length;
    };
    const updateMany = async ({ where, data }: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => {
      let changed = 0;
      for (const row of rows) {
        if (typeof where.id === 'string' && row.id !== where.id) continue;
        const idFilter = where.id as { not?: string } | undefined;
        if (idFilter?.not && row.id === idFilter.not) continue;
        if (where.phone && row.phone !== where.phone) continue;
        if (typeof where.used === 'boolean' && row.used !== where.used) continue;
        if (typeof where.attempts === 'number' && row.attempts !== where.attempts) continue;
        const attemptsLimit = where.attempts as { lt?: number } | undefined;
        if (attemptsLimit?.lt !== undefined && row.attempts >= attemptsLimit.lt) continue;
        const expiresAt = where.expiresAt as { gt?: Date } | undefined;
        if (expiresAt?.gt && row.expiresAt <= expiresAt.gt) continue;
        if (typeof data.used === 'boolean') row.used = data.used;
        if (data.expiresAt instanceof Date) row.expiresAt = data.expiresAt;
        if (typeof data.attempts === 'number') row.attempts = data.attempts;
        const attempts = data.attempts as { increment?: number } | undefined;
        if (attempts?.increment) row.attempts += attempts.increment;
        changed += 1;
      }
      return { count: changed };
    };
    const create = async ({ data }: { data: Omit<FakeSmsRow, 'id' | 'createdAt' | 'used' | 'attempts'> & Partial<FakeSmsRow> }) => {
      const row: FakeSmsRow = {
        id: `sms-${rows.length + 1}`,
        phone: data.phone,
        code: data.code,
        used: data.used ?? false,
        attempts: data.attempts ?? 0,
        requestIp: data.requestIp ?? null,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt ?? new Date(),
      };
      rows.push(row);
      return { id: row.id };
    };

    mocks.count.mockImplementation(count);
    mocks.updateMany.mockImplementation(updateMany);
    mocks.create.mockImplementation(create);
    const latestVerifiableRow = () => {
      const now = new Date();
      const row = rows
        .filter((candidate) => (
          candidate.phone === '13800138000'
          && !candidate.used
          && candidate.attempts < 5
          && candidate.expiresAt > now
        ))
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
      return row ? { ...row } : null;
    };
    mocks.findFirst.mockImplementation(async () => latestVerifiableRow());
    mocks.queryRaw.mockImplementation(async (query: { sql?: string }) => {
      if (query.sql?.includes('pg_advisory_xact_lock')) return [{ acquired: '' }];
      const row = latestVerifiableRow();
      return row ? [row] : [];
    });
    mocks.executeRaw.mockResolvedValue(0);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const releases: Array<() => void> = [];
      const queryRaw = async (query: { sql?: string; values?: unknown[] }) => {
        // Record the attempted query immediately, but only resolve a lock query
        // after the preceding transaction holding the same identity completes.
        const result = mocks.queryRaw(query);
        if (query.sql?.includes('pg_advisory_xact_lock')) {
          const identity = String(query.values?.[0]);
          const previous = advisoryLockTails.get(identity) ?? Promise.resolve();
          let release!: () => void;
          const tail = new Promise<void>((resolve) => { release = resolve; });
          advisoryLockTails.set(identity, tail);
          await previous;
          releases.push(() => {
            release();
            if (advisoryLockTails.get(identity) === tail) advisoryLockTails.delete(identity);
          });
        }
        return result;
      };
      try {
        return await callback({
          $queryRaw: queryRaw,
          $executeRaw: mocks.executeRaw,
          smsCode: {
            count: mocks.count,
            create: mocks.create,
            updateMany: mocks.updateMany,
          },
        });
      } finally {
        for (const release of releases.reverse()) release();
      }
    });
    mocks.sendSms.mockResolvedValue({ mode: 'provider' });
    mocks.userUpsert.mockResolvedValue(currentUser);
    mocks.enforcePlanExpiry.mockResolvedValue(currentUser);
  });

  it('serializes concurrent count-to-reserve operations for the same phone and IP', async () => {
    const first = responseRecorder();
    const second = responseRecorder();

    await Promise.all([
      handler(request('send') as never, first.response as never),
      handler(request('send') as never, second.response as never),
    ]);

    expect([first.state.status, second.state.status].sort()).toEqual([200, 429]);
    expect(mocks.sendSms).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
  });

  it('acquires sorted parameterized advisory locks before rate counts', async () => {
    const result = responseRecorder();

    await handler(request('send') as never, result.response as never);

    expect(result.state.status).toBe(200);
    const lockQueries = mocks.queryRaw.mock.calls
      .map(([query]) => query as { sql: string; values: string[] })
      .filter(({ sql }) => sql.includes('pg_advisory_xact_lock'))
      .slice(0, 2);
    expect(lockQueries).toHaveLength(2);
    expect(lockQueries.every(({ sql }) => sql.includes('pg_advisory_xact_lock'))).toBe(true);
    const identities = lockQueries.map(({ values }) => values[0]);
    expect(identities).toEqual([...identities].sort());
    expect(identities.every((identity) => (
      !identity.includes('13800138000') && !identity.includes('203.0.113.9')
    ))).toBe(true);
    expect(lockQueries.every(({ sql, values }) => sql.includes('?') && values.length === 1)).toBe(true);
    expect(mocks.executeRaw).not.toHaveBeenCalled();
    const lockCallOrders = mocks.queryRaw.mock.invocationCallOrder.slice(0, 2);
    expect(lockCallOrders[1])
      .toBeLessThan(mocks.count.mock.invocationCallOrder[0]);
  });

  it('serializes verification so concurrent guesses consume at most five attempts', async () => {
    rows.push({
      id: 'sms-existing',
      phone: '13800138000',
      code: hashSmsCode('13800138000', '654321'),
      used: false,
      attempts: 0,
      requestIp: '203.0.113.9',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    });
    const responses = Array.from({ length: 20 }, () => responseRecorder());

    await Promise.all(responses.map(({ response }) => (
      handler(request('verify', '000000') as never, response as never)
    )));

    expect(responses.every(({ state }) => state.status === 400)).toBe(true);
    expect(rows[0].attempts).toBe(5);
    expect(rows[0].used).toBe(true);
  });

  it('coordinates verification with activation through the phone advisory lock', async () => {
    rows.push({
      id: 'sms-lock-order',
      phone: '13800138000',
      code: hashSmsCode('13800138000', '654321'),
      used: false,
      attempts: 0,
      requestIp: '203.0.113.9',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    });
    const result = responseRecorder();

    await handler(request('verify', '000000') as never, result.response as never);

    expect(result.state.status).toBe(400);
    const [lockQuery, rowQuery] = mocks.queryRaw.mock.calls.map(([query]) => query as {
      sql: string;
      values: unknown[];
    });
    expect(lockQuery.sql).toContain('pg_advisory_xact_lock');
    expect(rowQuery.sql).toContain('FOR UPDATE');
    expect(rowQuery.sql).not.toContain('13800138000');
    expect(rowQuery.values).toEqual(['13800138000', 5]);
    expect(rowQuery.values).not.toContain('000000');
    expect(mocks.queryRaw.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.queryRaw.mock.invocationCallOrder[1]);
  });

  it('keeps a provider-pending reservation unverifiable, then activates it once', async () => {
    let acknowledgeDelivery!: (value: { mode: 'provider' }) => void;
    mocks.sendSms.mockImplementationOnce(() => new Promise((resolve) => {
      acknowledgeDelivery = resolve;
    }));
    const sendResponse = responseRecorder();
    const sending = handler(request('send') as never, sendResponse.response as never);

    await vi.waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    const deliveredCode = mocks.sendSms.mock.calls[0][1] as string;
    const earlyVerification = responseRecorder();
    await handler(
      request('verify', deliveredCode) as never,
      earlyVerification.response as never,
    );
    expect(earlyVerification.state.status).toBe(400);

    acknowledgeDelivery({ mode: 'provider' });
    await sending;
    expect(sendResponse.state.status).toBe(200);

    const finalVerification = responseRecorder();
    await handler(
      request('verify', deliveredCode) as never,
      finalVerification.response as never,
    );
    expect(finalVerification.state.status).toBe(200);
    expect(rows[0].used).toBe(true);
  });

  it('does not create a second reservation while delivery remains pending past 60 seconds', async () => {
    let acknowledgeDelivery!: (value: { mode: 'provider' }) => void;
    mocks.sendSms.mockImplementationOnce(() => new Promise((resolve) => {
      acknowledgeDelivery = resolve;
    }));
    const first = responseRecorder();
    const firstSending = handler(request('send') as never, first.response as never);
    await vi.waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));

    rows[0].createdAt = new Date(Date.now() - 61 * 1000);
    const second = responseRecorder();
    await handler(request('send') as never, second.response as never);

    expect(second.state.status).toBe(429);
    expect(mocks.sendSms).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);

    acknowledgeDelivery({ mode: 'provider' });
    await firstSending;
    expect(first.state.status).toBe(200);
  });

  it('allows exactly one of two concurrent correct-code consumers', async () => {
    rows.push({
      id: 'sms-once',
      phone: '13800138000',
      code: hashSmsCode('13800138000', '123456'),
      used: false,
      attempts: 0,
      requestIp: '203.0.113.9',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(),
    });
    const first = responseRecorder();
    const second = responseRecorder();

    await Promise.all([
      handler(request('verify', '123456') as never, first.response as never),
      handler(request('verify', '123456') as never, second.response as never),
    ]);

    expect([first.state.status, second.state.status].sort()).toEqual([200, 400]);
    expect(mocks.userUpsert).toHaveBeenCalledTimes(1);
    expect(rows[0].used).toBe(true);
  });

  it('keeps the previous active code when provider delivery fails', async () => {
    rows.push({
      id: 'sms-previous',
      phone: '13800138000',
      code: hashSmsCode('13800138000', '112233'),
      used: false,
      attempts: 0,
      requestIp: '203.0.113.9',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdAt: new Date(Date.now() - 61 * 1000),
    });
    mocks.sendSms.mockRejectedValueOnce(new Error('provider unavailable'));
    const sendResponse = responseRecorder();

    await handler(request('send') as never, sendResponse.response as never);
    expect(sendResponse.state.status).toBe(500);

    const verifyResponse = responseRecorder();
    await handler(
      request('verify', '112233') as never,
      verifyResponse.response as never,
    );
    expect(verifyResponse.state.status).toBe(200);
    expect(rows.find(({ id }) => id === 'sms-previous')?.used).toBe(true);
    expect(rows.find(({ id }) => id !== 'sms-previous')?.used).toBe(true);
  });

  it('expires a failed reservation so retry is possible after the 60-second rate window', async () => {
    mocks.sendSms.mockRejectedValueOnce(new Error('provider unavailable'));
    const failed = responseRecorder();
    await handler(request('send') as never, failed.response as never);
    expect(failed.state.status).toBe(500);
    expect(rows).toHaveLength(1);
    expect(rows[0].expiresAt.getTime()).toBeLessThanOrEqual(Date.now());

    rows[0].createdAt = new Date(Date.now() - 61 * 1000);
    const retry = responseRecorder();
    await handler(request('send') as never, retry.response as never);

    expect(retry.state.status).toBe(200);
    expect(mocks.sendSms).toHaveBeenCalledTimes(2);
  });

  it('reports activation database failures separately from provider delivery failures', async () => {
    const originalUpdateMany = mocks.updateMany.getMockImplementation();
    mocks.updateMany.mockImplementation(async (args: { data?: { attempts?: unknown } }) => {
      if (args.data?.attempts === 0) {
        throw Object.assign(new Error('database unavailable'), { code: 'P1001' });
      }
      return originalUpdateMany!(args);
    });
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = responseRecorder();

    await handler(request('send') as never, response.response as never);

    expect(response.state.status).toBe(503);
    expect(response.state.body).toEqual({
      success: false,
      error: '验证码状态确认失败，请重新获取',
    });
    expect(errorLog).toHaveBeenCalledWith(
      '[SMS] reservation activation failed',
      { code: 'P1001' },
    );
    expect(errorLog.mock.calls.some(([message]) => message === '[SMS] delivery failed')).toBe(false);
    errorLog.mockRestore();
  });
});
