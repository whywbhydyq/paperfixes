import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateBackfillExpiry,
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
    expect(calculateBackfillExpiry('2026-08-09T00:00:00.000Z').toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });

  it('documents the fixed-time three-step backfill and treats EPAY as retired history', () => {
    const rollout = readFileSync('docs/deployment/security-hardening-rollout.md', 'utf8');
    expect(rollout).toContain('同一个固定 UTC 时间戳');
    expect(rollout).toContain('dry-run → apply → dry-run=0');
    expect(rollout).toContain('PLAN_EXPIRY_BACKFILL_EXPECTED_COUNT');
    expect(rollout).toContain('PLAN_EXPIRY_BACKFILL_EXPECTED_DIGEST');
    expect(rollout).toContain('维护窗口');
    expect(rollout).toContain('未知或停用套餐');
    expect(rollout).toContain('不得声称已执行');
    expect(rollout).toContain('EPAY 已退役');
    expect(rollout).not.toContain('Confirm `EPAY_PID`');
  });
});
