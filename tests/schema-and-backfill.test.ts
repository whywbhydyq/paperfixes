import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateBackfillExpiry,
  runBackfill,
} from '../scripts/backfill-plan-expiry.mjs';

describe('security hardening schema', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const migration = readFileSync(
    'prisma/migrations/20260809000000_security_hardening/migration.sql',
    'utf8',
  );

  it('adds only the required nullable/defaulted fields and indexes', () => {
    expect(schema).toMatch(/planExpiresAt\s+DateTime\?/);
    expect(schema).toMatch(/attempts\s+Int\s+@default\(0\)/);
    expect(schema).toMatch(/requestIp\s+String\?/);
    expect(schema).toMatch(/providerTradeNo\s+String\?\s+@unique/);
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "planExpiresAt"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "attempts"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "requestIp"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "providerTradeNo"');
  });

  it('never deletes or truncates existing data', () => {
    expect(migration).not.toMatch(/\b(DROP|DELETE|TRUNCATE)\b/i);
    expect(schema).toMatch(/inputText\s+String/);
    expect(schema).toMatch(/outputText\s+String\?/);
  });

  it('gives legacy paid users a full 30-day grace period', () => {
    const deploymentAt = new Date('2026-08-09T00:00:00.000Z');
    expect(calculateBackfillExpiry(deploymentAt).toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });

  it('supports the required dry-run, fixed-time apply, then zero-candidate dry-run sequence', async () => {
    const users = [
      { id: 'paid-1', plan: 'basic', planExpiresAt: null as Date | null },
      { id: 'paid-2', plan: 'pro', planExpiresAt: null as Date | null },
      { id: 'free-1', plan: 'free', planExpiresAt: null as Date | null },
    ];
    const client = {
      user: {
        count: async () => users.filter((user) =>
          user.plan !== 'free' && user.planExpiresAt === null
        ).length,
        updateMany: async ({ data }: { data: { planExpiresAt: Date } }) => {
          let count = 0;
          for (const user of users) {
            if (user.plan !== 'free' && user.planExpiresAt === null) {
              user.planExpiresAt = data.planExpiresAt;
              count += 1;
            }
          }
          return { count };
        },
      },
    };
    const deploymentAt = new Date('2026-08-09T00:00:00.000Z');

    await expect(runBackfill({ apply: false, deploymentAt, client }))
      .resolves.toMatchObject({ candidates: 2, updated: 0 });
    expect(users[0].planExpiresAt).toBeNull();

    await expect(runBackfill({ apply: true, deploymentAt, client }))
      .resolves.toMatchObject({
        candidates: 2,
        updated: 2,
        expiresAt: new Date('2026-09-08T00:00:00.000Z'),
      });

    await expect(runBackfill({ apply: false, deploymentAt, client }))
      .resolves.toMatchObject({ candidates: 0, updated: 0 });
    expect(users[0].planExpiresAt?.toISOString()).toBe('2026-09-08T00:00:00.000Z');
    expect(users[1].planExpiresAt?.toISOString()).toBe('2026-09-08T00:00:00.000Z');
    expect(users[2].planExpiresAt).toBeNull();
  });

  it('documents the fixed-time three-step backfill and treats EPAY as retired history', () => {
    const rollout = readFileSync('docs/deployment/security-hardening-rollout.md', 'utf8');
    expect(rollout).toContain('同一个固定 UTC 时间戳');
    expect(rollout).toContain('dry-run → apply → dry-run=0');
    expect(rollout).toContain('EPAY 已退役');
    expect(rollout).not.toContain('Confirm `EPAY_PID`');
  });
});
