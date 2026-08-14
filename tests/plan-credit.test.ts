import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import {
  applyPlanCredit,
  PLAN_CHANGE_REQUIRES_EXPIRY_CODE,
} from '../api/_lib/plan-credit';

it('locks the user row before calculating a shared plan entitlement', async () => {
  const events: string[] = [];
  const tx = {
    $queryRaw: vi.fn(async (_parts: TemplateStringsArray, userId: string) => {
      events.push(`lock:${userId}`);
      return [{ id: userId }];
    }),
    user: {
      findUnique: vi.fn(async () => {
        events.push('read');
        return { id: 'u1', plan: 'free', quota: 3, planExpiresAt: null };
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        events.push('update');
        return {
          id: 'u1', plan: data.plan, quota: 53,
          planExpiresAt: data.planExpiresAt,
        };
      }),
    },
    topup: {
      create: vi.fn(async () => {
        events.push('topup');
        return {};
      }),
    },
  };

  await applyPlanCredit(tx as never, {
    userId: 'u1', planKey: 'basic', quota: 50, price: 29,
    note: 'test', effectiveAt: new Date('2026-08-10T00:00:00.000Z'),
  });

  expect(events).toEqual(['lock:u1', 'read', 'update', 'topup']);
  expect(tx.$queryRaw).toHaveBeenCalledOnce();
});

it('requires the row-lock capability instead of silently skipping it', () => {
  const source = readFileSync('api/_lib/plan-credit.ts', 'utf8');
  expect(source).toMatch(
    /Pick<\s*Prisma\.TransactionClient,\s*'user' \| 'topup' \| '\$queryRaw'\s*>/,
  );
  expect(source).not.toContain("Partial<Pick<Prisma.TransactionClient, '$queryRaw'>>");
  expect(source).not.toContain('if (tx.$queryRaw)');
  expect(source).toMatch(/await tx\.\$queryRaw`SELECT[\s\S]+FOR UPDATE`/);
});

it('rejects a cross-plan grant while the current paid plan is active', async () => {
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: 'u1' }]),
    user: {
      findUnique: vi.fn(async () => ({
        id: 'u1', plan: 'pro', quota: 17,
        planExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
      })),
      update: vi.fn(),
    },
    topup: { create: vi.fn() },
  };

  await expect(applyPlanCredit(tx as never, {
    userId: 'u1', planKey: 'basic', quota: 50, price: 29,
    note: 'cross plan', effectiveAt: new Date('2026-08-10T00:00:00.000Z'),
  })).rejects.toThrow(PLAN_CHANGE_REQUIRES_EXPIRY_CODE);

  expect(tx.$queryRaw).toHaveBeenCalledOnce();
  expect(tx.user.update).not.toHaveBeenCalled();
  expect(tx.topup.create).not.toHaveBeenCalled();
});

it('allows another fixed grant of the same active plan', async () => {
  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'u1', plan: data.plan, quota: 57, planExpiresAt: data.planExpiresAt,
  }));
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: 'u1' }]),
    user: {
      findUnique: vi.fn(async () => ({
        id: 'u1', plan: 'basic', quota: 7,
        planExpiresAt: new Date('2026-08-20T00:00:00.000Z'),
      })),
      update,
    },
    topup: { create: vi.fn(async () => ({})) },
  };

  const result = await applyPlanCredit(tx as never, {
    userId: 'u1', planKey: 'basic', quota: 50, price: 29,
    note: 'same plan', effectiveAt: new Date('2026-08-10T00:00:00.000Z'),
  });

  expect(result.planExpiresAt.toISOString()).toBe('2026-09-19T00:00:00.000Z');
  expect(update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ quota: { increment: 50 }, plan: 'basic' }),
  }));
});

it('does not let an unresolved legacy paid plan bypass the cross-plan rule', async () => {
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: 'u1' }]),
    user: {
      findUnique: vi.fn(async () => ({
        id: 'u1', plan: 'pro', quota: 17, planExpiresAt: null,
      })),
      update: vi.fn(),
    },
    topup: { create: vi.fn() },
  };

  await expect(applyPlanCredit(tx as never, {
    userId: 'u1', planKey: 'basic', quota: 50, price: 29,
    note: 'legacy cross plan', effectiveAt: new Date('2026-08-10T00:00:00.000Z'),
  })).rejects.toThrow(PLAN_CHANGE_REQUIRES_EXPIRY_CODE);
});
