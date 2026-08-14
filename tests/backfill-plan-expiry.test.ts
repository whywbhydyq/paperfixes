import { describe, expect, it, vi } from 'vitest';
import {
  calculateCandidateDigest,
  parseBackfillTimestamp,
  runBackfill,
  toSafeBackfillError,
} from '../scripts/backfill-plan-expiry.mjs';

const timestamp = '2026-08-09T00:00:00.000Z';
const plans = [
  {
    planKey: 'free', name: '免费体验', active: true, popular: false,
    price: 0, quota: 3, minChars: 40, maxChars: 500, features: [], sortOrder: 0,
  },
  {
    planKey: 'basic', name: '基础套餐', active: true, popular: true,
    price: 29, quota: 50, minChars: 40, maxChars: 3000, features: [], sortOrder: 1,
  },
  {
    planKey: 'pro', name: '专业套餐', active: true, popular: false,
    price: 99, quota: 300, minChars: 40, maxChars: 5000, features: [], sortOrder: 2,
  },
  {
    planKey: 'retired', name: '停用套餐', active: false, popular: false,
    price: 9, quota: 9, minChars: 40, maxChars: 500, features: [], sortOrder: 3,
  },
];

type FakeUser = { id: string; plan: string; planExpiresAt: Date | null };

function createBackfillClient(options: {
  users?: FakeUser[];
  configuredPlans?: unknown;
  lockedCandidates?: Array<{ id: string; plan: string }>;
} = {}) {
  const users = structuredClone(options.users ?? [
    { id: 'paid-1', plan: 'basic', planExpiresAt: null },
    { id: 'paid-2', plan: 'pro', planExpiresAt: null },
    { id: 'free-1', plan: 'free', planExpiresAt: null },
  ]) as FakeUser[];
  const events: string[] = [];
  const updateMany = vi.fn(async ({ where, data }: {
    where: { id: { in: string[] }; planExpiresAt: null };
    data: { planExpiresAt: Date };
  }) => {
    events.push('update');
    let count = 0;
    for (const user of users) {
      if (where.id.in.includes(user.id) && user.planExpiresAt === null) {
        user.planExpiresAt = data.planExpiresAt;
        count += 1;
      }
    }
    return { count };
  });
  const client = {
    users,
    events,
    updateMany,
    async $transaction<T>(callback: (tx: unknown) => Promise<T>) {
      events.push('transaction');
      const snapshot = structuredClone(users);
      const tx = {
        $queryRaw: async (parts: TemplateStringsArray) => {
          if (parts.join('').includes('pg_advisory_xact_lock')) {
            events.push('advisory-lock');
            return [{ locked: true }];
          }
          events.push('candidate-row-lock');
          return options.lockedCandidates ?? users
            .filter((user) => user.plan !== 'free' && user.planExpiresAt === null)
            .map(({ id, plan }) => ({ id, plan }));
        },
        config: {
          findUnique: async () => {
            events.push('config-read');
            return {
              value: JSON.stringify(options.configuredPlans ?? plans),
            };
          },
        },
        user: { updateMany },
      };
      try {
        return await callback(tx);
      } catch (error) {
        users.splice(0, users.length, ...snapshot);
        throw error;
      }
    },
  };
  return client;
}

describe('strict backfill timestamp', () => {
  it('accepts only canonical UTC millisecond ISO input', () => {
    expect(parseBackfillTimestamp(timestamp).toISOString()).toBe(timestamp);
  });

  it.each([
    '2026-08-09',
    '2026-08-09T00:00:00Z',
    '2026-08-09T00:00:00.000+00:00',
    '2026-08-09T08:00:00.000+08:00',
    '2026-08-09T00:00:00.000',
    '2026-8-9T00:00:00.000Z',
  ])('rejects non-canonical timestamp %s', (value) => {
    expect(() => parseBackfillTimestamp(value)).toThrow('BACKFILL_TIMESTAMP_INVALID');
  });
});

describe('safe transactional plan-expiry backfill', () => {
  it('produces a stable SHA-256 digest independent of candidate order', () => {
    const a = calculateCandidateDigest([
      { id: 'b', plan: 'pro' },
      { id: 'a', plan: 'basic' },
    ]);
    const b = calculateCandidateDigest([
      { id: 'a', plan: 'basic' },
      { id: 'b', plan: 'pro' },
    ]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toContain('paid');
  });

  it.each([
    ['unknown', [{ id: 'u1', plan: 'unknown' }]],
    ['retired', [{ id: 'u1', plan: 'retired' }]],
    ['free', [{ id: 'u1', plan: 'free' }]],
    ['empty', [{ id: 'u1', plan: '' }]],
  ])('fails safely for a %s candidate plan with zero updates', async (_label, lockedCandidates) => {
    const client = createBackfillClient({ lockedCandidates });
    await expect(runBackfill({ apply: false, timestamp, client }))
      .rejects.toThrow('BACKFILL_CANDIDATE_PLAN_INVALID');
    expect(client.updateMany).not.toHaveBeenCalled();
  });

  it('rejects invalid authoritative plan configuration with zero updates', async () => {
    const client = createBackfillClient({
      configuredPlans: [...plans, { ...plans[1], sortOrder: 4 }],
    });
    await expect(runBackfill({ apply: false, timestamp, client }))
      .rejects.toThrow('BACKFILL_PLAN_CONFIG_INVALID');
    expect(client.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a plan configuration with invalid entitlement values', async () => {
    const configuredPlans = structuredClone(plans);
    configuredPlans[1].quota = null as never;
    const client = createBackfillClient({ configuredPlans });
    await expect(runBackfill({ apply: false, timestamp, client }))
      .rejects.toThrow('BACKFILL_PLAN_CONFIG_INVALID');
    expect(client.updateMany).not.toHaveBeenCalled();
  });

  it('returns only aggregate dry-run evidence and no candidate identifiers', async () => {
    const client = createBackfillClient();
    const result = await runBackfill({ apply: false, timestamp, client });
    expect(result).toMatchObject({
      candidates: 2,
      updated: 0,
      planCounts: { basic: 1, pro: 1 },
      expiresAt: new Date('2026-09-08T00:00:00.000Z'),
    });
    expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toMatch(/paid-1|paid-2|free-1/);
  });

  it('rejects an expected-count or digest mismatch before updating', async () => {
    const client = createBackfillClient();
    await expect(runBackfill({
      apply: true,
      timestamp,
      expectedCount: 99,
      expectedDigest: '0'.repeat(64),
      client,
    })).rejects.toThrow('BACKFILL_EXPECTATION_MISMATCH');
    expect(client.updateMany).not.toHaveBeenCalled();
    expect(client.users[0].planExpiresAt).toBeNull();
  });

  it('uses one transaction and both locks before a precisely-scoped update', async () => {
    const client = createBackfillClient();
    const dryRun = await runBackfill({ apply: false, timestamp, client });
    client.events.splice(0);
    await runBackfill({
      apply: true,
      timestamp,
      expectedCount: dryRun.candidates,
      expectedDigest: dryRun.digest,
      client,
    });
    expect(client.events).toEqual([
      'transaction', 'advisory-lock', 'config-read', 'candidate-row-lock', 'update',
    ]);
    expect(client.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['paid-1', 'paid-2'] }, planExpiresAt: null },
      data: { planExpiresAt: new Date('2026-09-08T00:00:00.000Z') },
    });
  });

  it('applies the expected set once, then a repeated dry-run reports zero', async () => {
    const client = createBackfillClient();
    const dryRun = await runBackfill({ apply: false, timestamp, client });
    const applied = await runBackfill({
      apply: true,
      timestamp,
      expectedCount: dryRun.candidates,
      expectedDigest: dryRun.digest,
      client,
    });
    expect(applied.updated).toBe(2);
    await expect(runBackfill({ apply: false, timestamp, client }))
      .resolves.toMatchObject({ candidates: 0, updated: 0, planCounts: {} });
  });

  it('forbids an apply with expected count zero', async () => {
    const client = createBackfillClient({ users: [] });
    const digest = calculateCandidateDigest([]);
    await expect(runBackfill({
      apply: true, timestamp, expectedCount: 0, expectedDigest: digest, client,
    })).rejects.toThrow('BACKFILL_EMPTY_APPLY_FORBIDDEN');
    expect(client.updateMany).not.toHaveBeenCalled();
  });

  it('redacts unknown failures instead of logging connection details', () => {
    expect(toSafeBackfillError(new Error('postgres://user:secret@private-db.example/test')))
      .toEqual({
        code: 'BACKFILL_FAILED',
        message: 'Backfill failed safely; inspect restricted logs.',
      });
  });
});
