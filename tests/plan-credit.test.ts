import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { applyPlanCredit } from '../api/_lib/plan-credit';

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
