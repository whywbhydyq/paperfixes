import { describe, expect, it } from 'vitest';
import {
  createRedemptionCodes,
  hashRedemptionCode,
  normalizeRedemptionCode,
  redeemPlanCode,
  type RedemptionTransaction,
} from '../api/_lib/redemption-code';

const now = new Date('2026-08-10T00:00:00.000Z');
const displayCode = 'PF-ABCDE-FGHJK-LMNPQ-RSTUV';
const canonicalCode = 'PFABCDEFGHJKLMNPQRSTUV';
const secondDisplayCode = 'PF-23456-789AB-CDEFG-HJKLM';

interface FakeUser {
  id: string;
  plan: string;
  quota: number;
  planExpiresAt: Date | null;
}

interface FakeCode {
  id: string;
  codeHash: string;
  codeHint: string;
  planKey: string;
  quota: number;
  price: number;
  source: string;
  batchId: string | null;
  note: string | null;
  redeemedById: string | null;
  redeemedAt: Date | null;
  expiresAt: Date | null;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createRedemptionClient(options: {
  users?: FakeUser[];
  code?: Partial<FakeCode>;
  failTopup?: boolean;
} = {}) {
  const state = {
    users: new Map((options.users ?? [{
      id: 'u1', plan: 'free', quota: 3, planExpiresAt: null,
    }]).map((user) => [user.id, clone(user)])),
    code: {
      id: 'voucher-1',
      codeHash: hashRedemptionCode(displayCode),
      codeHint: 'STUV',
      planKey: 'basic',
      quota: 50,
      price: 29,
      source: 'marketplace',
      batchId: 'batch-1',
      note: null,
      redeemedById: null,
      redeemedAt: null,
      expiresAt: null,
      ...options.code,
    } as FakeCode,
    topups: [] as Array<Record<string, unknown>>,
  };

  let lock = Promise.resolve();
  const client = {
    state,
    async $transaction<T>(callback: (tx: RedemptionTransaction) => Promise<T>): Promise<T> {
      let release!: () => void;
      const previous = lock;
      lock = new Promise<void>((resolve) => { release = resolve; });
      await previous;

      const snapshot = clone({
        users: [...state.users.entries()],
        code: state.code,
        topups: state.topups,
      });
      const tx = {
        $queryRaw: async (_parts: TemplateStringsArray, userId: string) => (
          state.users.has(userId) ? [{ id: userId }] : []
        ),
        redemptionCode: {
          findUnique: async ({ where }: { where: { codeHash?: string; id?: string } }) => {
            if (where.codeHash && where.codeHash !== state.code.codeHash) return null;
            if (where.id && where.id !== state.code.id) return null;
            return clone(state.code);
          },
          updateMany: async ({ where, data }: {
            where: { id: string; redeemedAt: null; OR?: unknown };
            data: { redeemedById: string; redeemedAt: Date };
          }) => {
            const eligible = where.id === state.code.id
              && state.code.redeemedAt === null
              && (!state.code.expiresAt || state.code.expiresAt > data.redeemedAt);
            if (!eligible) return { count: 0 };
            Object.assign(state.code, clone(data));
            return { count: 1 };
          },
        },
        user: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            clone(state.users.get(where.id) ?? null),
          update: async ({ where, data }: {
            where: { id: string };
            data: { quota: number | { increment: number }; plan: string; planExpiresAt: Date };
          }) => {
            const user = state.users.get(where.id);
            if (!user) throw new Error('USER_NOT_FOUND');
            user.quota = typeof data.quota === 'number'
              ? data.quota
              : user.quota + data.quota.increment;
            user.plan = data.plan;
            user.planExpiresAt = clone(data.planExpiresAt);
            return clone(user);
          },
        },
        topup: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            if (options.failTopup) throw new Error('TOPUP_WRITE_FAILED');
            state.topups.push(clone(data));
            return clone(data);
          },
        },
      } as unknown as RedemptionTransaction;

      try {
        return await callback(tx);
      } catch (error) {
        state.users = new Map(snapshot.users);
        state.code = snapshot.code;
        state.topups = snapshot.topups;
        throw error;
      } finally {
        release();
      }
    },
  };
  return client;
}

function createBarrierRedemptionClient() {
  const codeFixtures: FakeCode[] = [
    {
      id: 'voucher-1', codeHash: hashRedemptionCode(displayCode), codeHint: 'STUV',
      planKey: 'basic', quota: 50, price: 29, source: 'marketplace', batchId: 'batch-1',
      note: null, redeemedById: null, redeemedAt: null, expiresAt: null,
    },
    {
      id: 'voucher-2', codeHash: hashRedemptionCode(secondDisplayCode), codeHint: 'JKLM',
      planKey: 'basic', quota: 50, price: 29, source: 'marketplace', batchId: 'batch-1',
      note: null, redeemedById: null, redeemedAt: null, expiresAt: null,
    },
  ];
  const state = {
    codes: new Map(codeFixtures.map((code) => [code.id, clone(code)])),
    user: {
      id: 'u1', plan: 'pro', quota: 7,
      planExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
    },
    topups: [] as Array<Record<string, unknown>>,
    lockEvents: [] as string[],
  };

  let barrierArrivals = 0;
  let openBarrier!: () => void;
  const barrier = new Promise<void>((resolve) => { openBarrier = resolve; });
  let userLockTail = Promise.resolve();
  let transactionSequence = 0;

  const client = {
    state,
    async $transaction<T>(callback: (tx: RedemptionTransaction) => Promise<T>): Promise<T> {
      const transactionId = ++transactionSequence;
      let releaseUserLock: (() => void) | null = null;
      const tx = {
        $queryRaw: async (_parts: TemplateStringsArray, userId: string) => {
          state.lockEvents.push(`wait:${transactionId}:${userId}`);
          barrierArrivals += 1;
          if (barrierArrivals === 2) openBarrier();
          await barrier;

          let release!: () => void;
          const previous = userLockTail;
          userLockTail = new Promise<void>((resolve) => { release = resolve; });
          await previous;
          releaseUserLock = release;
          state.lockEvents.push(`acquire:${transactionId}:${userId}`);
          return [{ id: userId }];
        },
        redemptionCode: {
          findUnique: async ({ where }: { where: { codeHash?: string; id?: string } }) => {
            const found = [...state.codes.values()].find((code) =>
              (where.codeHash ? code.codeHash === where.codeHash : code.id === where.id)
            );
            return found ? clone(found) : null;
          },
          updateMany: async ({ where, data }: {
            where: { id: string; redeemedAt: null; OR?: unknown };
            data: { redeemedById: string; redeemedAt: Date };
          }) => {
            const code = state.codes.get(where.id);
            if (!code || code.redeemedAt || (code.expiresAt && code.expiresAt <= data.redeemedAt)) {
              return { count: 0 };
            }
            Object.assign(code, clone(data));
            return { count: 1 };
          },
        },
        user: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            where.id === state.user.id ? clone(state.user) : null,
          update: async ({ where, data }: {
            where: { id: string };
            data: { quota: number | { increment: number }; plan: string; planExpiresAt: Date };
          }) => {
            if (where.id !== state.user.id) throw new Error('USER_NOT_FOUND');
            state.user.quota = typeof data.quota === 'number'
              ? data.quota
              : state.user.quota + data.quota.increment;
            state.user.plan = data.plan;
            state.user.planExpiresAt = clone(data.planExpiresAt);
            return clone(state.user);
          },
        },
        topup: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            state.topups.push(clone(data));
            return clone(data);
          },
        },
      } as unknown as RedemptionTransaction;

      try {
        return await callback(tx);
      } finally {
        if (releaseUserLock) {
          state.lockEvents.push(`release:${transactionId}:u1`);
          releaseUserLock();
        }
      }
    },
  };
  return client;
}

describe('redemption code generation', () => {
  it('normalizes formatting and hashes the canonical code consistently', () => {
    expect(normalizeRedemptionCode(`  ${displayCode.toLowerCase()}  `)).toBe(canonicalCode);
    expect(hashRedemptionCode(displayCode)).toBe(hashRedemptionCode(canonicalCode));
    expect(hashRedemptionCode(displayCode)).not.toContain(canonicalCode);
    expect(() => normalizeRedemptionCode('short-code')).toThrow('REDEMPTION_CODE_INVALID');
  });

  it('returns plaintext once while persisting only hashes and short hints', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const generationClient = {
      redemptionCode: {
        createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
          writes.push(...clone(data));
          return { count: data.length };
        },
      },
    };

    const result = await createRedemptionCodes({
      planKey: 'basic', quota: 50, price: 29, quantity: 1, source: 'marketplace',
    }, generationClient, {
      generateCode: () => displayCode,
      generateBatchId: () => 'batch-1',
    });

    expect(result.codes).toEqual([displayCode]);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      codeHash: hashRedemptionCode(displayCode),
      codeHint: 'STUV',
      batchId: 'batch-1',
      source: 'marketplace',
    });
    expect(writes[0]).not.toHaveProperty('code');
    expect(JSON.stringify(writes)).not.toContain(displayCode);
    expect(JSON.stringify(writes)).not.toContain(canonicalCode);
  });

  it('classifies a digest collision as a retryable generation conflict', async () => {
    const generationClient = {
      redemptionCode: {
        createMany: async () => {
          throw Object.assign(new Error('unique constraint'), { code: 'P2002' });
        },
      },
    };

    await expect(createRedemptionCodes({
      planKey: 'basic', quota: 50, quantity: 1,
    }, generationClient, {
      generateCode: () => displayCode,
      generateBatchId: () => 'batch-collision',
    })).rejects.toThrow('REDEMPTION_GENERATION_CONFLICT');
  });
});

describe('one-time plan redemption', () => {
  it('credits once and stacks 30 days after an active plan expiry', async () => {
    const client = createRedemptionClient({
      users: [{
        id: 'u1', plan: 'pro', quota: 7,
        planExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
      }],
    });

    const result = await redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client);

    expect(result.status).toBe('redeemed');
    expect(result.user).toMatchObject({ plan: 'basic', quota: 57 });
    expect(result.user.planExpiresAt?.toISOString()).toBe('2026-09-19T00:00:00.000Z');
    expect(client.state.code).toMatchObject({ redeemedById: 'u1', redeemedAt: now });
    expect(client.state.topups).toHaveLength(1);
    expect(client.state.topups[0]).toMatchObject({
      userId: 'u1', amount: 50, price: 29, planKey: 'basic',
    });
  });

  it('makes concurrent retries by the same user idempotent', async () => {
    const client = createRedemptionClient();

    const results = await Promise.all([
      redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client),
      redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client),
    ]);

    expect(results.map((result) => result.status).sort())
      .toEqual(['already_redeemed', 'redeemed']);
    expect(client.state.users.get('u1')?.quota).toBe(53);
    expect(client.state.topups).toHaveLength(1);
  });

  it('serializes two different codes for one user and stacks both 30-day periods', async () => {
    const client = createBarrierRedemptionClient();

    const results = await Promise.all([
      redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client),
      redeemPlanCode({ userId: 'u1', code: secondDisplayCode, redeemedAt: now }, client),
    ]);

    expect(results.map((result) => result.status)).toEqual(['redeemed', 'redeemed']);
    expect(client.state.user.quota).toBe(107);
    expect(client.state.user.planExpiresAt.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(client.state.topups).toHaveLength(2);
    expect(client.state.lockEvents.filter((event) => event.startsWith('wait:'))).toHaveLength(2);
    const criticalEvents = client.state.lockEvents.filter((event) =>
      event.startsWith('acquire:') || event.startsWith('release:')
    );
    expect(criticalEvents).toHaveLength(4);
    expect(criticalEvents[0]).toMatch(/^acquire:/);
    expect(criticalEvents[1]).toMatch(/^release:/);
    expect(criticalEvents[2]).toMatch(/^acquire:/);
    expect(criticalEvents[3]).toMatch(/^release:/);
  });

  it('does not let another user reuse a redeemed code', async () => {
    const client = createRedemptionClient({
      users: [
        { id: 'u1', plan: 'free', quota: 3, planExpiresAt: null },
        { id: 'u2', plan: 'free', quota: 3, planExpiresAt: null },
      ],
    });

    await redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client);
    await expect(redeemPlanCode({ userId: 'u2', code: displayCode, redeemedAt: now }, client))
      .rejects.toThrow('REDEMPTION_CODE_USED');
    expect(client.state.users.get('u2')?.quota).toBe(3);
    expect(client.state.topups).toHaveLength(1);
  });

  it('rejects expired codes without claiming or crediting them', async () => {
    const client = createRedemptionClient({
      code: { expiresAt: new Date('2026-08-09T23:59:59.000Z') },
    });

    await expect(redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client))
      .rejects.toThrow('REDEMPTION_CODE_EXPIRED');
    expect(client.state.code.redeemedAt).toBeNull();
    expect(client.state.users.get('u1')?.quota).toBe(3);
    expect(client.state.topups).toHaveLength(0);
  });

  it('rolls back the code claim and quota when the audit topup cannot be written', async () => {
    const client = createRedemptionClient({ failTopup: true });

    await expect(redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client))
      .rejects.toThrow('TOPUP_WRITE_FAILED');
    expect(client.state.code.redeemedAt).toBeNull();
    expect(client.state.users.get('u1')?.quota).toBe(3);
    expect(client.state.topups).toHaveLength(0);
  });

  it('clears stale paid quota before applying a redeemed plan', async () => {
    const client = createRedemptionClient({
      users: [{
        id: 'u1', plan: 'pro', quota: 19,
        planExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
      }],
    });

    const result = await redeemPlanCode({ userId: 'u1', code: displayCode, redeemedAt: now }, client);

    expect(result.user.quota).toBe(50);
    expect(result.user.planExpiresAt?.toISOString()).toBe('2026-09-09T00:00:00.000Z');
  });
});
