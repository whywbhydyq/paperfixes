import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateExtendedExpiry,
  enforcePlanExpiry,
  expireAllDuePlans,
} from '../api/_lib/plan-entitlements';
import { createPlanClient } from './helpers/plan-client';

describe('calculateExtendedExpiry', () => {
  const now = new Date('2026-08-09T00:00:00.000Z');

  it('starts at payment time without a current expiry', () => {
    expect(calculateExtendedExpiry(now, null).toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });

  it('adds 30 days after the remaining active period', () => {
    const current = new Date('2026-08-20T00:00:00.000Z');
    expect(calculateExtendedExpiry(now, current).toISOString())
      .toBe('2026-09-19T00:00:00.000Z');
  });

  it('restarts from payment time after expiry', () => {
    const expired = new Date('2026-08-01T00:00:00.000Z');
    expect(calculateExtendedExpiry(now, expired).toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });
});

it('atomically clears quota and restores the free plan only when due', async () => {
  const client = createPlanClient({
    id: 'u1',
    plan: 'pro',
    quota: 17,
    planExpiresAt: new Date('2026-08-08T23:59:59.000Z'),
  });

  const user = await enforcePlanExpiry(
    'u1',
    new Date('2026-08-09T00:00:00.000Z'),
    client,
  );

  expect(user).toMatchObject({ plan: 'free', quota: 0, planExpiresAt: null });
  expect(client.transitionCount).toBe(1);
});

it('does not clear an active or legacy-null paid plan', async () => {
  const now = new Date('2026-08-09T00:00:00.000Z');
  const activeClient = createPlanClient({
    id: 'active',
    plan: 'basic',
    quota: 8,
    planExpiresAt: new Date('2026-08-10T00:00:00.000Z'),
  });
  const legacyClient = createPlanClient({
    id: 'legacy',
    plan: 'basic',
    quota: 9,
    planExpiresAt: null,
  });

  expect((await enforcePlanExpiry('active', now, activeClient)).quota).toBe(8);
  expect((await enforcePlanExpiry('legacy', now, legacyClient)).quota).toBe(9);
  expect(activeClient.transitionCount + legacyClient.transitionCount).toBe(0);
});

it('two concurrent checks produce one state transition', async () => {
  const client = createPlanClient({
    id: 'u1',
    plan: 'basic',
    quota: 50,
    planExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
  });
  const now = new Date('2026-08-09T00:00:00.000Z');

  await Promise.all([
    enforcePlanExpiry('u1', now, client),
    enforcePlanExpiry('u1', now, client),
  ]);

  expect(client.transitionCount).toBe(1);
  expect(client.currentUser).toMatchObject({ plan: 'free', quota: 0, planExpiresAt: null });
});

it('bulk expiry returns the number of transitioned users', async () => {
  const client = createPlanClient({
    id: 'u1',
    plan: 'pro',
    quota: 12,
    planExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
  });

  await expect(expireAllDuePlans(new Date('2026-08-09T00:00:00.000Z'), client))
    .resolves.toBe(1);
});

describe('authoritative route integration', () => {
  it('enforces expiry before user reads and quota use', () => {
    const userRoute = readFileSync('api/user/index.ts', 'utf8');
    const submitRoute = readFileSync('api/rewrite/submit.ts', 'utf8');

    expect(userRoute).toContain('enforcePlanExpiry(userId)');
    expect(userRoute).toContain('planExpiresAt');
    expect(submitRoute).toContain('enforcePlanExpiry(userId)');
  });

  it('normalizes expired accounts before the admin user list', () => {
    const adminRoute = readFileSync('api/admin/index.ts', 'utf8');
    expect(adminRoute).toContain('expireAllDuePlans()');
    expect(adminRoute).toContain('planExpiresAt: true');
  });
});
